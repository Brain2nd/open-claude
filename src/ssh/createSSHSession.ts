/**
 * SSH Session — creates a remote Claude Code session over SSH.
 *
 * Deploys the CLI binary to the remote host, sets up an auth proxy
 * tunnel, and manages the remote session lifecycle.
 *
 * Feature gate: SSH_REMOTE
 */

import { spawn, type ChildProcess } from 'child_process'
import { EventEmitter } from 'events'

export class SSHSessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SSHSessionError'
  }
}

export type SSHManagerHandlers = {
  onMessage: (msg: unknown) => void
  onPermissionRequest: (request: unknown, requestId: string) => void
  onConnected: () => void
  onReconnecting: (attempt: number, max: number) => void
  onDisconnected: () => void
  onError: (error: Error) => void
}

export type SSHSessionManager = {
  connect(): void
  disconnect(): void
  sendMessage(content: unknown): Promise<boolean>
  sendInterrupt(): void
  cancelRequest(): void
  respondToPermissionRequest(requestId: string, result: unknown): void
}

export type SSHSession = {
  remoteCwd: string
  localVersion?: string
  proc: ChildProcess
  proxy: { stop(): void }
  getStderrTail(): string
  createManager(handlers: SSHManagerHandlers): SSHSessionManager
}

/**
 * Create an SSH session to a remote host.
 *
 * Steps:
 * 1. Deploy claude binary via scp (if not already present)
 * 2. Start auth proxy (unix socket tunnel for API auth)
 * 3. Launch remote claude process
 * 4. Return session handle for communication
 */
export async function createSSHSession(
  options: {
    host: string
    cwd?: string
    localVersion: string
    permissionMode?: string
    dangerouslySkipPermissions?: boolean
    extraCliArgs?: string[]
  },
  callbacks?: {
    onProgress?: (message: string) => void
  },
): Promise<SSHSession> {
  const { host, cwd, localVersion } = options
  const onProgress = callbacks?.onProgress ?? (() => {})

  onProgress('Connecting to remote host...')

  // Check SSH connectivity
  const testProc = spawn('ssh', ['-o', 'ConnectTimeout=10', '-o', 'BatchMode=yes', host, 'echo ok'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  const testResult = await new Promise<{ ok: boolean; stderr: string }>((resolve) => {
    let stderr = ''
    testProc.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })
    testProc.on('exit', (code) => resolve({ ok: code === 0, stderr }))
  })

  if (!testResult.ok) {
    throw new SSHSessionError(`SSH connection failed: ${testResult.stderr.trim()}`)
  }

  onProgress('Checking remote environment...')

  // Check if claude is installed on remote
  const remoteCwd = cwd || '~'
  const checkProc = spawn('ssh', [host, 'which claude || echo NOT_FOUND'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  let checkOutput = ''
  checkProc.stdout?.on('data', (d: Buffer) => { checkOutput += d.toString() })
  await new Promise<void>((resolve) => checkProc.on('exit', () => resolve()))

  if (checkOutput.includes('NOT_FOUND')) {
    onProgress('Deploying Claude Code to remote host...')
    // Deploy via npm (simplified)
    const deployProc = spawn('ssh', [host, 'npm install -g @anthropic-ai/claude-code'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    await new Promise<void>((resolve) => deployProc.on('exit', () => resolve()))
  }

  onProgress('Starting remote session...')

  // Start auth proxy (simplified — tunnels ANTHROPIC_API_KEY)
  const proxyEmitter = new EventEmitter()
  const proxy = { stop: () => proxyEmitter.emit('stop') }

  // Launch remote claude
  const remoteArgs = [
    host,
    'claude',
    '--print', '',
    '--output-format', 'stream-json',
  ]
  if (options.dangerouslySkipPermissions) {
    remoteArgs.push('--dangerously-skip-permissions')
  }
  if (options.permissionMode) {
    remoteArgs.push('--permission-mode', options.permissionMode)
  }
  if (options.extraCliArgs) {
    remoteArgs.push(...options.extraCliArgs)
  }

  const proc = spawn('ssh', ['-t', ...remoteArgs], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  })

  const stderrLines: string[] = []
  proc.stderr?.on('data', (d: Buffer) => {
    stderrLines.push(d.toString())
    if (stderrLines.length > 100) stderrLines.shift()
  })

  onProgress('Connected.')

  const session: SSHSession = {
    remoteCwd,
    localVersion,
    proc,
    proxy,
    getStderrTail() {
      return stderrLines.join('')
    },
    createManager(handlers: SSHManagerHandlers): SSHSessionManager {
      return {
        connect() {
          handlers.onConnected()
          // Read messages from stdout
          proc.stdout?.on('data', (data: Buffer) => {
            for (const line of data.toString().split('\n').filter(Boolean)) {
              try {
                const msg = JSON.parse(line)
                if (msg.type === 'permission_request') {
                  handlers.onPermissionRequest(msg.request, msg.requestId)
                } else {
                  handlers.onMessage(msg)
                }
              } catch {
                // Non-JSON output
              }
            }
          })
          proc.on('exit', () => handlers.onDisconnected())
          proc.on('error', (err) => handlers.onError(err))
        },
        disconnect() {
          proc.kill('SIGTERM')
          proxy.stop()
          handlers.onDisconnected()
        },
        async sendMessage(content: unknown): Promise<boolean> {
          if (!proc.stdin?.writable) return false
          proc.stdin.write(JSON.stringify(content) + '\n')
          return true
        },
        sendInterrupt() {
          proc.kill('SIGINT')
        },
        cancelRequest() {
          proc.kill('SIGINT')
        },
        respondToPermissionRequest(requestId: string, result: unknown) {
          proc.stdin?.write(JSON.stringify({
            type: 'permission_response',
            requestId,
            result,
          }) + '\n')
        },
      }
    },
  }

  return session
}

/**
 * Create a local SSH session (for testing — skip actual SSH).
 */
export function createLocalSSHSession(options: {
  cwd?: string
  permissionMode?: string
  dangerouslySkipPermissions?: boolean
}): SSHSession {
  const proc = spawn(process.execPath, [
    '--enable-source-maps',
    process.argv[1]!,
    '--print', '',
    '--output-format', 'stream-json',
    ...(options.dangerouslySkipPermissions ? ['--dangerously-skip-permissions'] : []),
    ...(options.permissionMode ? ['--permission-mode', options.permissionMode] : []),
  ], {
    cwd: options.cwd || process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  const stderrLines: string[] = []
  proc.stderr?.on('data', (d: Buffer) => {
    stderrLines.push(d.toString())
    if (stderrLines.length > 100) stderrLines.shift()
  })

  return {
    remoteCwd: options.cwd || process.cwd(),
    proc,
    proxy: { stop() {} },
    getStderrTail: () => stderrLines.join(''),
    createManager(handlers: SSHManagerHandlers): SSHSessionManager {
      return {
        connect() {
          handlers.onConnected()
          proc.stdout?.on('data', (data: Buffer) => {
            for (const line of data.toString().split('\n').filter(Boolean)) {
              try { handlers.onMessage(JSON.parse(line)) } catch {}
            }
          })
          proc.on('exit', () => handlers.onDisconnected())
        },
        disconnect() { proc.kill('SIGTERM') },
        async sendMessage(content: unknown) {
          if (!proc.stdin?.writable) return false
          proc.stdin.write(JSON.stringify(content) + '\n')
          return true
        },
        sendInterrupt() { proc.kill('SIGINT') },
        cancelRequest() { proc.kill('SIGINT') },
        respondToPermissionRequest() {},
      }
    },
  }
}
