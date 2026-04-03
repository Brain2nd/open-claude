/**
 * SDK utility types that can't be expressed as Zod schemas.
 */
import type { ModelUsage } from './coreTypes.generated.js'

/** ModelUsage with all fields guaranteed non-null (camelCase, for SDK/external use) */
export type NonNullableModelUsage = Required<ModelUsage>

/**
 * Internal usage object matching the Anthropic API snake_case response shape.
 * This is the type used throughout the codebase for tracking token usage.
 */
export type NonNullableUsage = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  server_tool_use: {
    web_search_requests: number
    web_fetch_requests: number
  }
  service_tier: string | null
  cache_creation: {
    ephemeral_1h_input_tokens: number
    ephemeral_5m_input_tokens: number
  }
  inference_geo?: string
  iterations?: unknown[]
  speed?: string
  /** Only present when CACHED_MICROCOMPACT feature is enabled */
  cache_deleted_input_tokens?: number
  /** Allow additional fields for forward compatibility with BetaUsage */
  [key: string]: any
}
