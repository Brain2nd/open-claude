/**
 * Server lock file — prevents multiple server instances.
 *
 * Writes/reads `~/.claude/server.lock` to coordinate a single
 * server process per machine.
 */

import { readFile, writeFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

type ServerLock = {
  pid: number
  port: number
  host: string
  httpUrl: string
  startedAt: number
}

const LOCK_DIR = join(homedir(), '.openclaude')
const LOCK_PATH = join(LOCK_DIR, 'server.lock')

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * Check if a server is already running. Returns lock info if alive, null otherwise.
 * Stale lock files (process dead) are automatically cleaned up.
 */
export async function probeRunningServer(): Promise<ServerLock | null> {
  try {
    const data = await readFile(LOCK_PATH, 'utf-8')
    const lock: ServerLock = JSON.parse(data)
    if (isProcessRunning(lock.pid)) {
      return lock
    }
    // Stale lock — clean it up
    await unlink(LOCK_PATH).catch(() => {})
    return null
  } catch {
    return null
  }
}

/**
 * Write the server lock file.
 */
export async function writeServerLock(lock: ServerLock): Promise<void> {
  if (!existsSync(LOCK_DIR)) {
    await mkdir(LOCK_DIR, { recursive: true })
  }
  await writeFile(LOCK_PATH, JSON.stringify(lock, null, 2))
}

/**
 * Remove the server lock file on shutdown.
 */
export async function removeServerLock(): Promise<void> {
  await unlink(LOCK_PATH).catch(() => {})
}
