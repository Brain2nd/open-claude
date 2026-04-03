/**
 * Stub type definitions for MCP component types.
 */

export interface StdioServerInfo {
  type: 'stdio'
  command: string
  args?: string[]
  env?: Record<string, string>
  scope: string
  name: string
  [key: string]: any
}

export interface SSEServerInfo {
  type: 'sse'
  url: string
  headers?: Record<string, string>
  scope: string
  name: string
  [key: string]: any
}

export interface HTTPServerInfo {
  type: 'http'
  url: string
  headers?: Record<string, string>
  scope: string
  name: string
  [key: string]: any
}

export interface ClaudeAIServerInfo {
  type?: string
  name: string
  scope: string
  [key: string]: any
}

export interface AgentMcpServerInfo {
  type: 'agent'
  name: string
  scope: string
  [key: string]: any
}

export type ServerInfo =
  | StdioServerInfo
  | SSEServerInfo
  | HTTPServerInfo
  | ClaudeAIServerInfo
  | AgentMcpServerInfo

export type MCPViewState = string
