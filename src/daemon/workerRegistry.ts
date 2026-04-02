/**
 * Daemon Worker Registry — manages background worker processes.
 *
 * Workers are long-lived subprocesses that handle background tasks
 * like scheduled cron jobs, file watching, etc.
 *
 * Feature gate: DAEMON
 */

import { spawn, type ChildProcess } from 'child_process'
import { resolve } from 'path'

type Worker = {
  id: string
  proc: ChildProcess
  startedAt: number
}

const workers = new Map<string, Worker>()

/**
 * Run a daemon worker by ID. Called from cli.tsx when --daemon-worker flag is used.
 * The worker communicates with the parent daemon process via stdio.
 */
export async function runDaemonWorker(workerId: string): Promise<void> {
  process.stderr.write(`[daemon-worker] Starting worker ${workerId}\n`)

  // Worker loop — reads tasks from stdin, executes them
  const readline = await import('readline')
  const rl = readline.createInterface({ input: process.stdin })

  for await (const line of rl) {
    try {
      const task = JSON.parse(line)
      if (task.type === 'shutdown') {
        break
      }
      if (task.type === 'execute') {
        // Execute the task (spawn a claude -p session)
        const cliPath = resolve(__dirname, '../../cli.js')
        const child = spawn(process.execPath, [
          cliPath,
          '--print', task.prompt,
          '--dangerously-skip-permissions',
          '--output-format', 'stream-json',
        ], {
          cwd: task.cwd || process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe'],
        })

        // Stream output back to parent
        child.stdout?.on('data', (data: Buffer) => {
          process.stdout.write(JSON.stringify({
            workerId,
            taskId: task.id,
            type: 'output',
            data: data.toString(),
          }) + '\n')
        })

        await new Promise<void>((resolve) => {
          child.on('exit', (code) => {
            process.stdout.write(JSON.stringify({
              workerId,
              taskId: task.id,
              type: 'done',
              exitCode: code,
            }) + '\n')
            resolve()
          })
        })
      }
    } catch (err) {
      process.stderr.write(`[daemon-worker] Error: ${err}\n`)
    }
  }

  process.stderr.write(`[daemon-worker] Worker ${workerId} shutting down\n`)
}
