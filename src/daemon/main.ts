/**
 * Daemon Main — background process that manages scheduled tasks and workers.
 *
 * The daemon runs persistently in the background, spawning worker
 * subprocesses to handle scheduled tasks (cron jobs), file watchers,
 * and other long-running operations.
 *
 * Started via `claude daemon` command.
 * Feature gate: DAEMON
 */

import { spawn, type ChildProcess } from 'child_process'
import { resolve } from 'path'
import { writeFile, readFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

const DAEMON_DIR = join(homedir(), '.openclaude', 'daemon')
const PID_FILE = join(DAEMON_DIR, 'daemon.pid')

type WorkerHandle = {
  id: string
  proc: ChildProcess
}

/**
 * Main entry point for the daemon process.
 */
export async function daemonMain(args: string[]): Promise<void> {
  const subcommand = args[0]

  if (subcommand === 'start' || !subcommand) {
    await startDaemon()
  } else if (subcommand === 'stop') {
    await stopDaemon()
  } else if (subcommand === 'status') {
    await showStatus()
  } else {
    process.stderr.write(`Unknown daemon command: ${subcommand}\n`)
    process.stderr.write('Usage: claude daemon [start|stop|status]\n')
    process.exit(1)
  }
}

async function ensureDaemonDir(): Promise<void> {
  if (!existsSync(DAEMON_DIR)) {
    await mkdir(DAEMON_DIR, { recursive: true })
  }
}

async function startDaemon(): Promise<void> {
  await ensureDaemonDir()

  // Check if already running
  if (existsSync(PID_FILE)) {
    try {
      const pid = parseInt(await readFile(PID_FILE, 'utf-8'), 10)
      process.kill(pid, 0)
      process.stderr.write(`Daemon already running (pid ${pid})\n`)
      process.exit(1)
    } catch {
      // Stale PID file
      await unlink(PID_FILE).catch(() => {})
    }
  }

  // Write PID file
  await writeFile(PID_FILE, String(process.pid))

  process.stderr.write(`[daemon] Started (pid ${process.pid})\n`)

  // Set up graceful shutdown
  const shutdown = async () => {
    process.stderr.write('[daemon] Shutting down...\n')
    // Kill all workers
    for (const worker of workers.values()) {
      worker.proc.kill('SIGTERM')
    }
    await unlink(PID_FILE).catch(() => {})
    process.exit(0)
  }
  process.once('SIGINT', () => void shutdown())
  process.once('SIGTERM', () => void shutdown())

  const workers = new Map<string, WorkerHandle>()

  // Main daemon loop — check for scheduled tasks
  const checkInterval = setInterval(async () => {
    // Read scheduled tasks from project directories
    // This is a simplified version — the full implementation would
    // watch multiple project directories and manage cron schedules
  }, 60_000)

  // Keep daemon alive
  await new Promise<void>(() => {
    // Never resolves — daemon runs until killed
  })
}

async function stopDaemon(): Promise<void> {
  if (!existsSync(PID_FILE)) {
    process.stderr.write('No daemon running\n')
    process.exit(1)
  }

  try {
    const pid = parseInt(await readFile(PID_FILE, 'utf-8'), 10)
    process.kill(pid, 'SIGTERM')
    process.stderr.write(`Daemon stopped (pid ${pid})\n`)
  } catch {
    process.stderr.write('Failed to stop daemon (process may have already exited)\n')
    await unlink(PID_FILE).catch(() => {})
  }
}

async function showStatus(): Promise<void> {
  if (!existsSync(PID_FILE)) {
    process.stderr.write('Daemon is not running\n')
    return
  }

  try {
    const pid = parseInt(await readFile(PID_FILE, 'utf-8'), 10)
    process.kill(pid, 0)
    process.stderr.write(`Daemon is running (pid ${pid})\n`)
  } catch {
    process.stderr.write('Daemon is not running (stale PID file)\n')
    await unlink(PID_FILE).catch(() => {})
  }
}
