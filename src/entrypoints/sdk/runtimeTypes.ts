/**
 * SDK Runtime Types - Non-serializable types with callbacks/interfaces.
 *
 * These types are used by SDK consumers to interact with Claude Code
 * programmatically. They include callbacks, interfaces with methods,
 * and other types that can't be represented as Zod schemas.
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import type { z } from 'zod/v4'
import type {
  McpServerConfigForProcessTransport,
  OutputFormat,
  PermissionMode,
  SDKMessage,
  SDKResultMessage,
  SDKSessionInfo,
  SDKUserMessage,
  ThinkingConfig,
} from './coreTypes.generated.js'

// ============================================================================
// Effort Level
// ============================================================================

export type EffortLevel = 'low' | 'medium' | 'high' | 'max'

// ============================================================================
// Zod Shape Utilities
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyZodRawShape = Record<string, z.ZodType<any>>
export type InferShape<T extends AnyZodRawShape> = {
  [K in keyof T]: z.infer<T[K]>
}

// ============================================================================
// MCP Server Config (with instance)
// ============================================================================

export type McpSdkServerConfigWithInstance = {
  type: 'sdk'
  name: string
  server: Server
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SdkMcpToolDefinition<Schema extends AnyZodRawShape = any> = {
  name: string
  description: string
  inputSchema: Schema
  handler: (args: InferShape<Schema>, extra: unknown) => Promise<unknown>
  annotations?: {
    readOnly?: boolean
    destructive?: boolean
    openWorld?: boolean
  }
  searchHint?: string
  alwaysLoad?: boolean
}

// ============================================================================
// Query Options
// ============================================================================

export type Options = {
  model?: string
  maxTurns?: number
  maxTokens?: number
  maxThinkingTokens?: number
  thinking?: ThinkingConfig
  systemPrompt?: string
  appendSystemPrompt?: string
  mcpServers?: Record<string, McpServerConfigForProcessTransport | McpSdkServerConfigWithInstance>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools?: Array<SdkMcpToolDefinition<any>>
  allowedTools?: string[]
  disallowedTools?: string[]
  permissionMode?: PermissionMode
  cwd?: string
  additionalDirectories?: string[]
  signal?: AbortSignal
  outputFormat?: OutputFormat
  betas?: string[]
  effort?: EffortLevel
  /** @internal */
  sessionId?: string
  /** @internal */
  continueConversation?: boolean
  /** @internal */
  agentPrompt?: string
}

/** @internal */
export type InternalOptions = Options & {
  /** @internal */
  parentSessionId?: string
  /** @internal */
  enableRemoteControl?: boolean
  /** @internal */
  customApiKeyInfo?: unknown
}

// ============================================================================
// Query Result
// ============================================================================

export type Query = AsyncIterable<SDKMessage> & {
  result: Promise<SDKResultMessage>
  abort(): void
}

/** @internal */
export type InternalQuery = Query & {
  /** @internal */
  sessionId: string
}

// ============================================================================
// Session Types
// ============================================================================

export type SDKSessionOptions = {
  model?: string
  systemPrompt?: string
  appendSystemPrompt?: string
  mcpServers?: Record<string, McpServerConfigForProcessTransport | McpSdkServerConfigWithInstance>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools?: Array<SdkMcpToolDefinition<any>>
  allowedTools?: string[]
  disallowedTools?: string[]
  permissionMode?: PermissionMode
  cwd?: string
  additionalDirectories?: string[]
  effort?: EffortLevel
  betas?: string[]
}

export type SessionMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string | unknown[]
  timestamp?: string
}

export type SDKSession = {
  readonly sessionId: string
  prompt(
    message: string | AsyncIterable<SDKUserMessage>,
    options?: { signal?: AbortSignal; maxTurns?: number },
  ): Query
  getMessages(): Promise<SessionMessage[]>
  abort(): void
}

// ============================================================================
// List/Get/Fork Options
// ============================================================================

export type ListSessionsOptions = {
  dir?: string
  limit?: number
  offset?: number
}

export type GetSessionInfoOptions = {
  dir?: string
}

export type GetSessionMessagesOptions = {
  dir?: string
  limit?: number
  offset?: number
  includeSystemMessages?: boolean
}

export type SessionMutationOptions = {
  dir?: string
}

export type ForkSessionOptions = {
  dir?: string
  upToMessageId?: string
  title?: string
}

export type ForkSessionResult = {
  sessionId: string
}
