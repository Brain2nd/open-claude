/**
 * Remote command execution for execFileNoThrow over SSH proxy.
 *
 * Routes git and other project-related commands to the remote host.
 * System utilities (codesign, which, etc.) stay local.
 *
 * Feature gate: SSH_PROXY
 */

import type { SSHConnectionManager } from './SSHConnectionManager.js'

function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'"
}

/**
 * Determine if a command should run on the remote host.
 * Only project-related binaries (git, etc.) are proxied.
 */
export function shouldRunRemotely(file: string): boolean {
  const basename = file.split('/').pop() ?? file
  return basename === 'git'
}

/**
 * Execute a command on the remote host, returning the same shape
 * as execFileNoThrow (never throws).
 */
export async function execFileNoThrowRemote(
  file: string,
  args: string[],
  options: {
    cwd?: string
    timeout?: number
    input?: string
  },
  conn: SSHConnectionManager,
): Promise<{ stdout: string; stderr: string; code: number; error?: string }> {
  const basename = file.split('/').pop() ?? file
  const quotedArgs = args.map(a => shellQuote(a)).join(' ')
  const cmd = `${basename} ${quotedArgs}`

  try {
    const result = await conn.exec(cmd, {
      cwd: options.cwd,
      timeout: options.timeout,
    })

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code,
      ...(result.code !== 0 ? { error: result.stderr.trim() || `Exit code ${result.code}` } : {}),
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return {
      stdout: '',
      stderr: message,
      code: 1,
      error: message,
    }
  }
}
