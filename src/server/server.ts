/**
 * Claude Code HTTP/WebSocket Server.
 *
 * Provides a REST API + WebSocket transport for remote/headless sessions.
 * Started via `claude server`.
 */

import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'http'
import { randomUUID } from 'crypto'
import type { SessionManager } from './sessionManager.js'
import type { ServerLogger } from './serverLog.js'

type ServerConfig = {
  port: number
  host: string
  authToken: string
  unix?: string
  workspace?: string
  idleTimeoutMs: number
  maxSessions: number
}

type ServerHandle = {
  port: number | undefined
  stop(graceful: boolean): void
}

function checkAuth(req: IncomingMessage, authToken: string): boolean {
  const header = req.headers.authorization
  if (!header) return false
  const [scheme, token] = header.split(' ')
  return scheme === 'Bearer' && token === authToken
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

export function startServer(
  config: ServerConfig,
  sessionManager: SessionManager,
  logger: ServerLogger,
): ServerHandle {
  const httpServer = createHttpServer(async (req, res) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      })
      res.end()
      return
    }

    // Auth check (skip health endpoint)
    if (req.url !== '/health' && !checkAuth(req, config.authToken)) {
      sendJson(res, 401, { error: 'Unauthorized' })
      return
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    const path = url.pathname

    try {
      // Health check
      if (path === '/health' && req.method === 'GET') {
        sendJson(res, 200, { status: 'ok', version: '2.1.88' })
        return
      }

      // Create session
      if (path === '/sessions' && req.method === 'POST') {
        const body = JSON.parse(await readBody(req))
        const session = sessionManager.createSession(
          body.cwd || config.workspace || process.cwd(),
          {
            prompt: body.prompt,
            outputFormat: body.outputFormat,
            model: body.model,
            systemPrompt: body.systemPrompt,
            appendSystemPrompt: body.appendSystemPrompt,
          },
        )
        logger.info('Session created', { sessionId: session.id, cwd: session.cwd })
        sendJson(res, 201, {
          sessionId: session.id,
          pid: session.pid,
        })
        return
      }

      // List sessions
      if (path === '/sessions' && req.method === 'GET') {
        sendJson(res, 200, { sessions: sessionManager.listSessions() })
        return
      }

      // Get/delete specific session
      const sessionMatch = path.match(/^\/sessions\/([^/]+)$/)
      if (sessionMatch) {
        const sessionId = sessionMatch[1]!
        if (req.method === 'GET') {
          const session = sessionManager.getSession(sessionId)
          if (!session) {
            sendJson(res, 404, { error: 'Session not found' })
            return
          }
          sendJson(res, 200, {
            id: session.id,
            cwd: session.cwd,
            pid: session.pid,
            createdAt: session.createdAt,
          })
          return
        }
        if (req.method === 'DELETE') {
          sessionManager.stopSession(sessionId)
          logger.info('Session stopped', { sessionId })
          sendJson(res, 200, { status: 'stopped' })
          return
        }
      }

      sendJson(res, 404, { error: 'Not found' })
    } catch (err) {
      logger.error('Request error', { error: String(err), path })
      sendJson(res, 500, { error: String(err) })
    }
  })

  if (config.unix) {
    httpServer.listen(config.unix)
    logger.info('Server listening', { unix: config.unix })
  } else {
    httpServer.listen(config.port, config.host)
    logger.info('Server listening', { host: config.host, port: config.port })
  }

  const address = httpServer.address()
  const actualPort = typeof address === 'object' && address ? address.port : config.port

  return {
    port: actualPort,
    stop(graceful: boolean) {
      if (graceful) {
        httpServer.close()
      } else {
        httpServer.close()
        // Force close all connections
        httpServer.closeAllConnections?.()
      }
    },
  }
}
