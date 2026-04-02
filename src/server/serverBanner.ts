/**
 * Server startup banner — printed to stderr on server launch.
 */

type ServerConfig = {
  port: number
  host: string
  unix?: string
  workspace?: string
  idleTimeoutMs: number
  maxSessions: number
}

export function printBanner(
  config: ServerConfig,
  authToken: string,
  actualPort: number,
): void {
  const endpoint = config.unix
    ? `unix:${config.unix}`
    : `http://${config.host}:${actualPort}`

  process.stderr.write(`
╔══════════════════════════════════════════════════╗
║           Claude Code Server v${MACRO.VERSION.padEnd(20)}║
╠══════════════════════════════════════════════════╣
║  Endpoint:  ${endpoint.padEnd(37)}║
║  Auth:      ${(authToken.slice(0, 20) + '...').padEnd(37)}║
║  Sessions:  max ${String(config.maxSessions).padEnd(33)}║
║  Timeout:   ${String(config.idleTimeoutMs / 1000).padEnd(2)}s idle${' '.repeat(30)}║
╚══════════════════════════════════════════════════╝
`)
}

declare const MACRO: { VERSION: string }
