/**
 * SessionManager — manages active server sessions.
 *
 * Handles session lifecycle: creation, tracking, idle timeout, and cleanup.
 */

import type { ChildProcess } from 'child_process'
import { randomUUID } from 'crypto'
import type { DangerousBackend } from './backends/dangerousBackend.js'

type SessionInfo = {
  id: string
  cwd: string
  pid: number
  proc: ChildProcess
  createdAt: number
  lastActivityAt: number
  idleTimer?: ReturnType<typeof setTimeout>
}

export class SessionManager {
  private sessions = new Map<string, SessionInfo>()
  private backend: DangerousBackend
  private idleTimeoutMs: number
  private maxSessions: number

  constructor(
    backend: DangerousBackend,
    options: {
      idleTimeoutMs?: number
      maxSessions?: number
    } = {},
  ) {
    this.backend = backend
    this.idleTimeoutMs = options.idleTimeoutMs ?? 3600_000 // 1 hour default
    this.maxSessions = options.maxSessions ?? 10
  }

  createSession(
    cwd: string,
    options: {
      prompt?: string
      outputFormat?: string
      model?: string
      systemPrompt?: string
      appendSystemPrompt?: string
    } = {},
  ): SessionInfo {
    if (this.sessions.size >= this.maxSessions) {
      throw new Error(`Maximum sessions (${this.maxSessions}) reached`)
    }

    const id = randomUUID()
    const proc = this.backend.spawnSession(cwd, {
      sessionId: id,
      ...options,
    })

    const session: SessionInfo = {
      id,
      cwd,
      pid: proc.pid!,
      proc,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    }

    // Set up idle timeout
    this.resetIdleTimer(session)

    // Clean up on process exit
    proc.on('exit', () => {
      this.sessions.delete(id)
    })

    this.sessions.set(id, session)
    return session
  }

  getSession(id: string): SessionInfo | undefined {
    const session = this.sessions.get(id)
    if (session) {
      session.lastActivityAt = Date.now()
      this.resetIdleTimer(session)
    }
    return session
  }

  stopSession(id: string): void {
    const session = this.sessions.get(id)
    if (!session) return
    if (session.idleTimer) clearTimeout(session.idleTimer)
    session.proc.kill('SIGTERM')
    this.sessions.delete(id)
  }

  async destroyAll(): Promise<void> {
    const promises: Promise<void>[] = []
    for (const [id, session] of this.sessions) {
      if (session.idleTimer) clearTimeout(session.idleTimer)
      promises.push(
        new Promise<void>((resolve) => {
          session.proc.on('exit', () => resolve())
          session.proc.kill('SIGTERM')
          // Force kill after 5s
          setTimeout(() => {
            session.proc.kill('SIGKILL')
            resolve()
          }, 5000)
        }),
      )
    }
    await Promise.all(promises)
    this.sessions.clear()
  }

  listSessions(): Array<{ id: string; cwd: string; pid: number; createdAt: number }> {
    return [...this.sessions.values()].map(s => ({
      id: s.id,
      cwd: s.cwd,
      pid: s.pid,
      createdAt: s.createdAt,
    }))
  }

  private resetIdleTimer(session: SessionInfo): void {
    if (session.idleTimer) clearTimeout(session.idleTimer)
    if (this.idleTimeoutMs > 0) {
      session.idleTimer = setTimeout(() => {
        this.stopSession(session.id)
      }, this.idleTimeoutMs)
    }
  }
}
