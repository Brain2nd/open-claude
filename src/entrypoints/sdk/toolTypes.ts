/**
 * SDK Tool Types — internal types for the tool system.
 * @internal until SDK API stabilizes
 */

export type SDKToolStatus = 'idle' | 'running' | 'done' | 'error'

export type SDKToolUse = {
  id: string
  name: string
  input: Record<string, unknown>
}

export type SDKToolResult = {
  type: 'tool_result'
  tool_use_id: string
  content: string | Array<{ type: string; text?: string }>
  is_error?: boolean
}
