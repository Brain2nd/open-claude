/**
 * SDK Settings types — generated from settings JSON schema.
 *
 * This is a simplified version. The full type mirrors the settings.json schema
 * which defines hooks, permissions, MCP servers, etc.
 */

export type Settings = {
  permissions?: {
    allow?: string[]
    deny?: string[]
    additionalDirectories?: string[]
  }
  hooks?: Record<string, Array<{
    matcher?: string
    command: string
    timeout?: number
  }>>
  mcpServers?: Record<string, {
    command: string
    args?: string[]
    env?: Record<string, string>
    type?: string
    url?: string
  }>
  env?: Record<string, string>
  model?: string
  smallModel?: string
  thinking?: {
    type: 'adaptive' | 'enabled' | 'disabled'
    budgetTokens?: number
  }
  [key: string]: unknown
}
