/**
 * Remote ripgrep execution over SSH proxy.
 *
 * When the SSH proxy is active, ripgrep commands are executed on the
 * remote host. Falls back to grep/find if rg is not installed remotely.
 *
 * Feature gate: SSH_PROXY
 */

import type { SSHConnectionManager } from './SSHConnectionManager.js'

let remoteHasRg: boolean | null = null

function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'"
}

/**
 * Check once whether the remote host has ripgrep installed.
 */
function checkRemoteRg(conn: SSHConnectionManager): boolean {
  if (remoteHasRg !== null) return remoteHasRg
  const result = conn.execSyncFull('which rg 2>/dev/null')
  remoteHasRg = result.code === 0
  return remoteHasRg
}

/**
 * Execute ripgrep on the remote host.
 * If rg is not available, falls back to grep/find for basic functionality.
 */
export async function ripGrepRemote(
  args: string[],
  target: string,
  abortSignal: AbortSignal,
  conn: SSHConnectionManager,
): Promise<string[]> {
  const hasRg = checkRemoteRg(conn)

  if (hasRg) {
    // Run rg directly on remote
    const quotedArgs = args.map(a => shellQuote(a)).join(' ')
    const cmd = `rg ${quotedArgs} ${shellQuote(target)}`
    const result = await conn.exec(cmd, { timeout: 60_000 })

    // rg exit code 1 = no matches (not an error)
    if (result.code > 1) {
      // Real error — return empty
      return []
    }

    return result.stdout.split('\n').filter(Boolean)
  }

  // Fallback: determine what kind of operation this is
  const isFileListing = args.includes('--files')

  if (isFileListing) {
    return fallbackFileList(args, target, conn)
  }

  return fallbackGrep(args, target, conn)
}

/**
 * Streaming variant for remote ripgrep.
 * Spawns the remote command and invokes onLines as data arrives.
 */
export async function ripGrepStreamRemote(
  args: string[],
  target: string,
  abortSignal: AbortSignal,
  onLines: (lines: string[]) => void,
  conn: SSHConnectionManager,
): Promise<void> {
  const hasRg = checkRemoteRg(conn)
  const cmd = hasRg
    ? `rg ${args.map(shellQuote).join(' ')} ${shellQuote(target)}`
    : buildFallbackCommand(args, target)

  const proc = conn.spawn(cmd)

  // Wire abort
  const onAbort = () => proc.kill('SIGTERM')
  abortSignal.addEventListener('abort', onAbort, { once: true })

  return new Promise((resolve, reject) => {
    let buffer = ''

    proc.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      if (lines.length > 0) {
        onLines(lines.filter(Boolean))
      }
    })

    proc.on('exit', () => {
      abortSignal.removeEventListener('abort', onAbort)
      if (buffer.trim()) {
        onLines([buffer.trim()])
      }
      resolve()
    })

    proc.on('error', (err) => {
      abortSignal.removeEventListener('abort', onAbort)
      reject(err)
    })
  })
}

/**
 * Remote file count (equivalent of ripGrepFileCount).
 */
export async function ripGrepFileCountRemote(
  args: string[],
  target: string,
  abortSignal: AbortSignal,
  conn: SSHConnectionManager,
): Promise<number> {
  const hasRg = checkRemoteRg(conn)

  if (hasRg) {
    const cmd = `rg ${args.map(shellQuote).join(' ')} ${shellQuote(target)} | wc -l`
    const result = await conn.exec(cmd, { timeout: 60_000 })
    return parseInt(result.stdout.trim(), 10) || 0
  }

  // Fallback: count files with find
  const result = await conn.exec(`find ${shellQuote(target)} -type f 2>/dev/null | wc -l`, { timeout: 60_000 })
  return parseInt(result.stdout.trim(), 10) || 0
}

// --- Fallback implementations ---

/**
 * Fallback file listing using find when rg --files is requested.
 */
async function fallbackFileList(
  args: string[],
  target: string,
  conn: SSHConnectionManager,
): Promise<string[]> {
  // Extract glob patterns from args
  const globPatterns: string[] = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--glob' && args[i + 1]) {
      globPatterns.push(args[++i]!)
    }
  }

  let cmd: string
  if (globPatterns.length > 0) {
    // Convert glob to find -name patterns
    const namePatterns = globPatterns
      .filter(g => !g.startsWith('!')) // Skip exclusion patterns for simplicity
      .map(g => {
        // Simple glob → find -name conversion
        const basename = g.split('/').pop() ?? g
        return `-name ${shellQuote(basename)}`
      })
      .join(' -o ')

    const excludePatterns = globPatterns
      .filter(g => g.startsWith('!'))
      .map(g => {
        const basename = g.slice(1).split('/').pop() ?? g.slice(1)
        return `-not -name ${shellQuote(basename)}`
      })
      .join(' ')

    cmd = `find ${shellQuote(target)} -type f \\( ${namePatterns} \\) ${excludePatterns} 2>/dev/null`
  } else {
    cmd = `find ${shellQuote(target)} -type f 2>/dev/null`
  }

  // Respect --sort=modified if present
  if (args.includes('--sort=modified') || args.includes('--sortr=modified')) {
    cmd += ` -printf '%T@ %p\\n' | sort -rn | cut -d' ' -f2-`
  }

  const result = await conn.exec(cmd, { timeout: 60_000 })
  return result.stdout.split('\n').filter(Boolean)
}

/**
 * Fallback content search using grep when rg pattern search is requested.
 */
async function fallbackGrep(
  args: string[],
  target: string,
  conn: SSHConnectionManager,
): Promise<string[]> {
  // Extract pattern (last non-flag argument before target, or after -e)
  let pattern: string | null = null
  const grepFlags: string[] = ['-r'] // recursive by default

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!
    if (arg === '-e' && args[i + 1]) {
      pattern = args[++i]!
    } else if (arg === '-l') {
      grepFlags.push('-l')
    } else if (arg === '-c') {
      grepFlags.push('-c')
    } else if (arg === '-i') {
      grepFlags.push('-i')
    } else if (arg === '-n') {
      grepFlags.push('-n')
    } else if (!arg.startsWith('-') && !pattern) {
      pattern = arg
    }
  }

  if (!pattern) return []

  const cmd = `grep ${grepFlags.join(' ')} ${shellQuote(pattern)} ${shellQuote(target)} 2>/dev/null`
  const result = await conn.exec(cmd, { timeout: 60_000 })
  return result.stdout.split('\n').filter(Boolean)
}

function buildFallbackCommand(args: string[], target: string): string {
  const isFileListing = args.includes('--files')
  if (isFileListing) {
    return `find ${shellQuote(target)} -type f 2>/dev/null`
  }
  // Try to extract pattern for grep fallback
  let pattern: string | null = null
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-e' && args[i + 1]) {
      pattern = args[++i]!
    } else if (!args[i]!.startsWith('-') && !pattern) {
      pattern = args[i]!
    }
  }
  if (pattern) {
    return `grep -rn ${shellQuote(pattern)} ${shellQuote(target)} 2>/dev/null`
  }
  return `echo ""`
}
