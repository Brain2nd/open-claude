/**
 * SSH Connection Manager — manages a persistent SSH ControlMaster connection
 * and provides sync/async command execution over the multiplexed socket.
 *
 * Uses the system's native `ssh` binary (not npm ssh2) for Bun compatibility.
 * All subsequent operations after connect() reuse the ControlMaster socket,
 * so each spawnSync/spawn call only costs fork+exec with no SSH handshake.
 *
 * Feature gate: SSH_PROXY
 */

import {
  spawn,
  spawnSync,
  type ChildProcess,
  type SpawnSyncReturns,
} from 'child_process'
import { createHash } from 'crypto'
import { EventEmitter } from 'events'
import { tmpdir } from 'os'
import { join } from 'path'

export type SSHConnectionOptions = {
  host: string
  port?: number
  identityFile?: string
}

export type SSHExecResult = {
  stdout: string
  stderr: string
  code: number
}

type SSHConnectionEvents = {
  reconnecting: [attempt: number, max: number]
  reconnected: []
  disconnected: []
  heartbeatFailed: []
}

/**
 * Manages a persistent SSH connection via ControlMaster.
 *
 * Usage:
 *   const conn = new SSHConnectionManager({ host: 'user@server' })
 *   await conn.connect()
 *   const result = conn.execSync('ls -la /home')
 *   await conn.disconnect()
 */
export class SSHConnectionManager extends EventEmitter<SSHConnectionEvents> {
  readonly host: string
  readonly port: number | undefined
  readonly identityFile: string | undefined

  private controlPath: string
  private masterProc: ChildProcess | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private _connected = false
  private remoteOS: 'Linux' | 'Darwin' | 'unknown' = 'unknown'

  constructor(options: SSHConnectionOptions) {
    super()
    this.host = options.host
    this.port = options.port
    this.identityFile = options.identityFile

    // Unique control socket path based on host+port
    const hash = createHash('md5')
      .update(`${this.host}:${this.port ?? 22}`)
      .digest('hex')
      .slice(0, 12)
    this.controlPath = join(tmpdir(), `openclaude-ssh-${hash}`)
  }

  /**
   * Base SSH args that target the ControlMaster socket.
   * Every ssh/sftp call reuses these to multiplex over the master connection.
   */
  private baseArgs(): string[] {
    const args = [
      '-o', `ControlPath=${this.controlPath}`,
    ]
    if (this.port) {
      args.push('-p', String(this.port))
    }
    if (this.identityFile) {
      args.push('-i', this.identityFile)
    }
    return args
  }

  /**
   * Establish the ControlMaster connection.
   * Tests connectivity first, then spawns a persistent background master.
   */
  async connect(): Promise<void> {
    // 1. Start ControlMaster — this is the ONLY connection that may prompt
    //    for a password. stdio is inherited so the user can type their
    //    password/passphrase interactively. Once established, all subsequent
    //    operations reuse the socket and never need auth again.
    const masterArgs = [
      '-o', 'ControlMaster=yes',
      '-o', `ControlPath=${this.controlPath}`,
      '-o', 'ControlPersist=600',
      '-o', 'ServerAliveInterval=15',
      '-o', 'ServerAliveCountMax=3',
      '-o', 'ConnectTimeout=10',
      // NO BatchMode — allows password/passphrase prompts on first connect
      ...this.portArgs(),
      ...(this.identityFile ? ['-i', this.identityFile] : []),
      '-N', // No command — just hold the connection
      this.host,
    ]

    // stdin/stderr inherited so user can see password prompt and type response
    this.masterProc = spawn('ssh', masterArgs, {
      stdio: ['inherit', 'ignore', 'inherit'],
      detached: true,
    })

    // Wait for the master connection to establish.
    // The user may need time to type a password/passphrase, so we poll
    // for up to 60 seconds. The master process exits early on auth failure.
    await new Promise<void>((resolve, reject) => {
      let resolved = false
      const MAX_WAIT_MS = 60_000
      const POLL_INTERVAL_MS = 500
      let elapsed = 0

      const poll = setInterval(() => {
        if (resolved) return
        elapsed += POLL_INTERVAL_MS

        // Check if master socket is ready
        const check = spawnSync('ssh', [
          '-o', `ControlPath=${this.controlPath}`,
          '-O', 'check',
          this.host,
        ], { timeout: 5000 })

        if (check.status === 0) {
          resolved = true
          clearInterval(poll)
          resolve()
        } else if (elapsed >= MAX_WAIT_MS) {
          resolved = true
          clearInterval(poll)
          reject(new SSHConnectionError('SSH connection timed out (60s)'))
        }
      }, POLL_INTERVAL_MS)

      this.masterProc!.on('error', (err) => {
        if (resolved) return
        resolved = true
        clearInterval(poll)
        reject(new SSHConnectionError(`SSH master process error: ${err.message}`))
      })

      this.masterProc!.on('exit', (code) => {
        if (resolved) return
        if (code !== null && code !== 0) {
          resolved = true
          clearInterval(poll)
          reject(new SSHConnectionError(
            `SSH authentication failed (exit code ${code}). Check your credentials.`,
          ))
        }
      })
    })

    this._connected = true

    // 3. Detect remote OS (used for stat format differences)
    try {
      const osResult = this.execSync('uname -s')
      const os = osResult.trim()
      if (os === 'Linux') this.remoteOS = 'Linux'
      else if (os === 'Darwin') this.remoteOS = 'Darwin'
    } catch {
      // Non-critical — fallback to 'unknown'
    }
  }

  /**
   * Execute a command on the remote host synchronously.
   * Uses spawnSync over the ControlMaster socket — no SSH handshake overhead.
   */
  execSync(cmd: string, options?: { cwd?: string; input?: string }): string {
    const args = [
      ...this.baseArgs(),
      this.host,
      options?.cwd ? `cd ${shellQuote(options.cwd)} && ${cmd}` : cmd,
    ]

    const result: SpawnSyncReturns<Buffer> = spawnSync('ssh', args, {
      timeout: 30_000,
      maxBuffer: 50 * 1024 * 1024, // 50MB
      input: options?.input,
      windowsHide: true,
    })

    if (result.error) {
      throw new SSHConnectionError(`SSH exec failed: ${result.error.message}`)
    }

    if (result.status !== 0 && result.status !== null) {
      const stderr = result.stderr?.toString() ?? ''
      // Only throw on SSH-level errors, not remote command failures
      if (stderr.includes('Connection refused') ||
          stderr.includes('Connection closed') ||
          stderr.includes('No such file or directory') && stderr.includes('ControlPath')) {
        throw new SSHConnectionError(`SSH connection lost: ${stderr.trim()}`)
      }
    }

    return result.stdout?.toString() ?? ''
  }

  /**
   * Execute a command on the remote host synchronously, returning full result.
   */
  execSyncFull(cmd: string, options?: { cwd?: string; input?: string }): SSHExecResult {
    const args = [
      ...this.baseArgs(),
      this.host,
      options?.cwd ? `cd ${shellQuote(options.cwd)} && ${cmd}` : cmd,
    ]

    const result = spawnSync('ssh', args, {
      timeout: 30_000,
      maxBuffer: 50 * 1024 * 1024,
      input: options?.input,
      windowsHide: true,
    })

    return {
      stdout: result.stdout?.toString() ?? '',
      stderr: result.stderr?.toString() ?? '',
      code: result.status ?? 1,
    }
  }

  /**
   * Execute a command on the remote host asynchronously.
   */
  async exec(cmd: string, options?: { cwd?: string; timeout?: number }): Promise<SSHExecResult> {
    const args = [
      ...this.baseArgs(),
      this.host,
      options?.cwd ? `cd ${shellQuote(options.cwd)} && ${cmd}` : cmd,
    ]

    return this.execProcess('ssh', args, options?.timeout)
  }

  /**
   * Spawn a remote command and return the ChildProcess for streaming.
   * Caller is responsible for handling stdout/stderr/exit events.
   */
  spawn(cmd: string, options?: { cwd?: string }): ChildProcess {
    const fullCmd = options?.cwd
      ? `cd ${shellQuote(options.cwd)} && ${cmd}`
      : cmd

    const args = [
      ...this.baseArgs(),
      this.host,
      fullCmd,
    ]

    return spawn('ssh', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    })
  }

  /**
   * Start periodic heartbeat checks.
   * Emits 'heartbeatFailed' and attempts reconnection on failure.
   */
  startHeartbeat(intervalMs = 30_000): void {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (!this.checkConnection()) {
        this.emit('heartbeatFailed')
        this._connected = false
        void this.attemptReconnect()
      }
    }, intervalMs)
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  /**
   * Check if the ControlMaster connection is alive.
   */
  checkConnection(): boolean {
    const result = spawnSync('ssh', [
      '-o', `ControlPath=${this.controlPath}`,
      '-O', 'check',
      this.host,
    ], { timeout: 5000 })

    return result.status === 0
  }

  isConnected(): boolean {
    return this._connected
  }

  getRemoteOS(): 'Linux' | 'Darwin' | 'unknown' {
    return this.remoteOS
  }

  /**
   * Gracefully close the ControlMaster connection.
   */
  async disconnect(): Promise<void> {
    this.stopHeartbeat()
    this._connected = false

    // Ask ControlMaster to exit gracefully
    spawnSync('ssh', [
      '-o', `ControlPath=${this.controlPath}`,
      '-O', 'exit',
      this.host,
    ], { timeout: 5000 })

    // Kill master process if still alive
    if (this.masterProc && !this.masterProc.killed) {
      this.masterProc.kill('SIGTERM')
      this.masterProc = null
    }
  }

  /**
   * Attempt to reconnect after a connection loss.
   * Tries up to 3 times with exponential backoff.
   */
  private async attemptReconnect(): Promise<boolean> {
    for (let i = 1; i <= 3; i++) {
      this.emit('reconnecting', i, 3)

      // Clean up old master
      if (this.masterProc && !this.masterProc.killed) {
        this.masterProc.kill('SIGTERM')
        this.masterProc = null
      }

      await sleep(i * 2000) // Exponential backoff: 2s, 4s, 6s

      try {
        await this.connect()
        this._connected = true
        this.emit('reconnected')
        return true
      } catch {
        // Continue to next attempt
      }
    }

    this.emit('disconnected')
    return false
  }

  private portArgs(): string[] {
    return this.port ? ['-p', String(this.port)] : []
  }

  private execProcess(
    binary: string,
    args: string[],
    timeout = 30_000,
  ): Promise<SSHExecResult> {
    return new Promise((resolve) => {
      const proc = spawn(binary, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout,
        windowsHide: true,
      })

      let stdout = ''
      let stderr = ''

      proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString() })
      proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })

      proc.on('exit', (code) => {
        resolve({ stdout, stderr, code: code ?? 1 })
      })

      proc.on('error', (err) => {
        resolve({ stdout, stderr: stderr || err.message, code: 1 })
      })
    })
  }
}

export class SSHConnectionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SSHConnectionError'
  }
}

function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'"
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
