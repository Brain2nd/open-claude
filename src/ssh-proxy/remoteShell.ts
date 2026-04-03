/**
 * Remote shell command execution over SSH proxy.
 *
 * Replaces the local Shell.ts exec() path when SSH proxy is active.
 * Commands are sent to the remote host via SSHConnectionManager.spawn(),
 * and CWD is tracked by parsing `pwd -P` output appended to each command.
 *
 * Feature gate: SSH_PROXY
 */

import { mkdir } from 'fs/promises'
import { setCwdState } from '../bootstrap/state.js'
import { generateTaskId } from '../Task.js'
import { pwd } from '../utils/cwd.js'
import { logForDebugging } from '../utils/debug.js'
import type { ExecOptions } from '../utils/Shell.js'
import {
  createAbortedCommand,
  type ShellCommand,
  wrapSpawn,
} from '../utils/ShellCommand.js'
import { getTaskOutputDir } from '../utils/task/diskOutput.js'
import { TaskOutput } from '../utils/task/TaskOutput.js'
import type { SSHConnectionManager } from './SSHConnectionManager.js'

// Marker used to separate command output from the CWD tracking line.
const CWD_MARKER = '___OPENCLAUDE_CWD___'

/**
 * Execute a shell command on the remote host via SSH proxy.
 *
 * The command is wrapped with `cd <cwd> && <command>` and a CWD tracker
 * is appended to detect directory changes (e.g., from `cd` commands).
 */
export async function execRemote(
  command: string,
  abortSignal: AbortSignal,
  _shellType: string,
  options: ExecOptions | undefined,
  conn: SSHConnectionManager,
): Promise<ShellCommand> {
  const {
    timeout,
    onProgress,
    shouldAutoBackground,
    onStdout,
  } = options ?? {}

  const commandTimeout = timeout || 30 * 60 * 1000 // 30 minutes

  if (abortSignal.aborted) {
    return createAbortedCommand()
  }

  const cwd = pwd()

  // Construct remote command with CWD tracking.
  // After the user command, we echo a marker followed by `pwd -P` so we can
  // extract the new working directory from stdout.
  const remoteCmd = [
    `cd ${shellQuote(cwd)}`,
    command,
    `__exit_code=$?`,
    `echo "${CWD_MARKER}"`,
    `pwd -P`,
    `exit $__exit_code`,
  ].join(' && ')

  const usePipeMode = !!onStdout
  const taskId = generateTaskId('local_bash')
  const taskOutput = new TaskOutput(taskId, onProgress ?? null, !usePipeMode)
  await mkdir(getTaskOutputDir(), { recursive: true })

  const childProcess = conn.spawn(remoteCmd)

  const shellCommand = wrapSpawn(
    childProcess,
    abortSignal,
    commandTimeout,
    taskOutput,
    shouldAutoBackground,
  )

  // If in pipe mode, intercept stdout to strip CWD marker and forward to onStdout
  if (usePipeMode && onStdout) {
    let cwdBuffer = ''
    const origStdout = childProcess.stdout
    if (origStdout) {
      origStdout.on('data', (data: Buffer) => {
        const str = data.toString()
        cwdBuffer += str

        // Check if we have the CWD marker in accumulated output
        const markerIdx = cwdBuffer.indexOf(CWD_MARKER)
        if (markerIdx === -1) {
          // No marker yet — forward everything except a trailing partial marker
          const safeEnd = cwdBuffer.length - CWD_MARKER.length
          if (safeEnd > 0) {
            onStdout(cwdBuffer.slice(0, safeEnd))
            cwdBuffer = cwdBuffer.slice(safeEnd)
          }
        }
        // If marker found, we'll handle it in the 'exit' handler below
      })
    }
  }

  // After command completes, extract new CWD from output
  shellCommand.result.then((result) => {
    const output = result.stdout ?? ''
    const markerIdx = output.lastIndexOf(CWD_MARKER)
    if (markerIdx !== -1) {
      const afterMarker = output.slice(markerIdx + CWD_MARKER.length).trim()
      const newCwdLine = afterMarker.split('\n')[0]?.trim()
      if (newCwdLine && newCwdLine.startsWith('/')) {
        logForDebugging(`[SSH Proxy] CWD changed: ${cwd} → ${newCwdLine}`)
        setCwdState(newCwdLine)
      }
    }
  }).catch(() => {
    // Ignore — command may have been interrupted
  })

  return shellCommand
}

function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'"
}
