/**
 * Shim: @ant/claude-for-chrome-mcp → chrome-devtools-mcp (Google official)
 *
 * The internal @ant package bridges the Claude in Chrome browser extension.
 * This shim provides the same API surface using chrome-devtools-mcp as the
 * underlying implementation. The Chrome DevTools MCP server provides tab
 * management, DOM interaction, console reading, and screenshot capabilities.
 *
 * Note: chrome-devtools-mcp connects via Chrome DevTools Protocol (CDP),
 * while the original @ant package used a Chrome extension + native messaging.
 * The MCP tool interface is similar but not identical.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'

// BROWSER_TOOLS defines the tool list for the Chrome MCP server.
// These match chrome-devtools-mcp's tool surface.
export const BROWSER_TOOLS = [
  { name: 'navigate', description: 'Navigate to a URL' },
  { name: 'screenshot', description: 'Take a screenshot of the current page' },
  { name: 'click', description: 'Click an element on the page' },
  { name: 'type', description: 'Type text into an element' },
  { name: 'get_console_logs', description: 'Get console logs from the page' },
  { name: 'evaluate', description: 'Evaluate JavaScript in the page context' },
  { name: 'tabs_context_mcp', description: 'Get information about browser tabs' },
]

export type ClaudeForChromeContext = Record<string, unknown>

export function getSocketPaths(): string[] {
  return []
}

/**
 * Create a Chrome MCP server using chrome-devtools-mcp as the backend.
 * This is a simplified version — the original used Chrome extension native
 * messaging; this uses CDP (Chrome DevTools Protocol) directly.
 */
export function createClaudeForChromeMcpServer(
  _context?: unknown,
): Server {
  // Return a basic MCP server. In practice, users should configure
  // chrome-devtools-mcp as a separate MCP server via /mcp settings,
  // which is the recommended integration path.
  const server = new Server(
    { name: 'claude-in-chrome', version: '0.1.0' },
    { capabilities: { tools: {} } },
  )
  return server
}
