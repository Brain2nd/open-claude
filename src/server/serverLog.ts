/**
 * Server logging — structured logger for server mode.
 */

export type ServerLogger = {
  info(msg: string, data?: Record<string, unknown>): void
  warn(msg: string, data?: Record<string, unknown>): void
  error(msg: string, data?: Record<string, unknown>): void
  debug(msg: string, data?: Record<string, unknown>): void
}

export function createServerLogger(): ServerLogger {
  const log = (level: string, msg: string, data?: Record<string, unknown>) => {
    const entry = {
      time: new Date().toISOString(),
      level,
      msg,
      ...data,
    }
    process.stderr.write(JSON.stringify(entry) + '\n')
  }

  return {
    info: (msg, data) => log('info', msg, data),
    warn: (msg, data) => log('warn', msg, data),
    error: (msg, data) => log('error', msg, data),
    debug: (msg, data) => log('debug', msg, data),
  }
}
