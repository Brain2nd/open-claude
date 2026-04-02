/**
 * Reactive Compact — triggers compaction when a 413 prompt-too-long
 * error is received during streaming.
 *
 * Feature gate: REACTIVE_COMPACT
 */

import type { Message } from '../../types/message.js'

/**
 * Check if reactive compaction is enabled.
 */
export function isReactiveCompactEnabled(): boolean {
  return true
}

type CompactionResult = {
  summaryMessages: Message[]
  attachments: Message[]
  hookResults: Message[]
  preCompactTokenCount: number
  postCompactTokenCount: number
  truePostCompactTokenCount: number
  compactionUsage?: Record<string, unknown>
}

/**
 * Attempt reactive compaction when a 413 is withheld.
 *
 * Delegates to the existing compactConversation() infrastructure.
 */
export async function tryReactiveCompact(config: {
  hasAttempted: boolean
  querySource: unknown
  aborted: boolean
  messages: Message[]
  cacheSafeParams: {
    systemPrompt: unknown
    userContext: string
    systemContext: string
    toolUseContext: unknown
    forkContextMessages: Message[]
  }
}): Promise<CompactionResult | null> {
  if (config.hasAttempted || config.aborted) {
    return null
  }

  // In a full implementation, this would:
  // 1. Call compactConversation() from compact.ts
  // 2. Return the compacted messages
  // For now, return null to indicate no compaction was possible
  return null
}

/**
 * Check if a withheld message is a 413 prompt-too-long error.
 */
export function isWithheldPromptTooLong(
  message: unknown,
): boolean {
  if (!message || typeof message !== 'object') return false
  const msg = message as Record<string, unknown>
  // Check for API error with 413 status
  if ('error' in msg) {
    const err = msg.error as Record<string, unknown>
    return err?.type === 'error' && (err?.error as Record<string, unknown>)?.type === 'prompt_too_long'
  }
  return false
}

/**
 * Check if a withheld message is a media size error.
 */
export function isWithheldMediaSizeError(
  message: unknown,
): boolean {
  if (!message || typeof message !== 'object') return false
  const msg = message as Record<string, unknown>
  if ('error' in msg) {
    const err = msg.error as Record<string, unknown>
    return err?.type === 'error' && (err?.error as Record<string, unknown>)?.type === 'invalid_request_error'
  }
  return false
}
