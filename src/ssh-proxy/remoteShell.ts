/**
 * Remote shell command execution over SSH proxy.
 *
 * Replaces the local Shell.ts exec() path when SSH proxy is active.
 * Commands are sent to the remote host via SSHConnectionManager.spawn(),
 * and CWD is tracked by parsing `pwd -P` output appended to each command.
 *
 * Key difference from local exec: SSH spawn always uses pipe mode
 * (stdout comes back through the SSH pipe, not a local file fd).
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
  } = options ?? {}

  const commandTimeout = timeout || 30 * 60 * 1000 // 30 minutes

  if (abortSignal.aborted) {
    return createAbortedCommand()
  }

  const cwd = pwd()

  // Construct remote command with CWD tracking.
  // After the user command, we echo a marker followed by `pwd -P` so we can
  // extract the new working directory from stdout.
  const remoteCmd = `cd ${shellQuote(cwd)} && (${command}); __oc_ec=$?; echo "${CWD_MARKER}"; pwd -P; exit $__oc_ec`

  const taskId = generateTaskId('local_bash')
  // SSH spawn ALWAYS returns output via pipe (not file fd),
  // so use pipe mode (useFile=false) for TaskOutput.
  const taskOutput = new TaskOutput(taskId, onProgress ?? null, false)
  await mkdir(getTaskOutputDir(), { recursive: true })

  const childProcess = conn.spawn(remoteCmd)

  const shellCommand = wrapSpawn(
    childProcess,
    abortSignal,
    commandTimeout,
    taskOutput,
    shouldAutoBackground,
  )

  // After command completes, extract new CWD from the TaskOutput content
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

      // Strip the CWD marker and pwd from the result so the user doesn't see it
      // (mutate result in place — it's already resolved)
      result.stdout = output.slice(0, markerIdx).trimEnd()
    }
  }).catch(() => {
    // Ignore — command may have been interrupted
  })

  return shellCommand
}

function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'"
}
