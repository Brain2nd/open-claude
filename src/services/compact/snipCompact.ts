/**
 * Snip Compact — identifies old, low-value message regions and marks them
 * for snipping. When enabled, tool results from early turns are replaced
 * with compact summaries to free context window space.
 *
 * Feature gate: HISTORY_SNIP
 */

import type { Message } from '../../types/message.js'

const SNIP_MARKER_TYPE = 'snip-marker'

/**
 * Check if snip runtime is enabled (feature flag + runtime config).
 */
export function isSnipRuntimeEnabled(): boolean {
  return true // Enabled when this module is loaded (behind HISTORY_SNIP gate)
}

/**
 * Check if a message is a snip marker (boundary between snipped and live content).
 */
export function isSnipMarkerMessage(message: Message): boolean {
  if (!message || !('content' in message)) return false
  const content = (message as { content?: unknown }).content
  if (typeof content === 'string') {
    return content.includes(SNIP_MARKER_TYPE)
  }
  if (Array.isArray(content)) {
    return content.some(
      (block: { type?: string; text?: string }) =>
        block.type === 'text' && typeof block.text === 'string' && block.text.includes(SNIP_MARKER_TYPE),
    )
  }
  return false
}

/**
 * Perform snip compaction on the message array.
 * Identifies old tool results that can be safely snipped.
 */
export function snipCompactIfNeeded(
  messages: Message[],
  _options?: { force?: boolean },
): { messages: Message[]; tokensFreed: number; boundaryMessage?: Message } {
  // Simplified: no-op for now, returns messages unchanged
  return { messages, tokensFreed: 0 }
}

/**
 * Check if we should suggest snipping to the user.
 */
export function shouldNudgeForSnips(): boolean {
  return false
}
