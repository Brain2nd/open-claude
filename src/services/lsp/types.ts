/**
 * Stub type definitions for LSP types.
 */

export interface LspServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
  languages?: string[]
  [key: string]: any
}

export interface ScopedLspServerConfig extends LspServerConfig {
  scope?: string
  [key: string]: any
}

export type LspServerState = 'starting' | 'running' | 'stopped' | 'error' | string
