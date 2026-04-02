/**
 * Snip Projection — view projection for snipped messages.
 *
 * Filters out snipped messages from the array for display/API,
 * replacing them with boundary markers.
 *
 * Feature gate: HISTORY_SNIP
 */

import type { Message } from '../../types/message.js'

const SNIP_BOUNDARY_TYPE = 'snip-boundary'

/**
 * Check if a message is a snip boundary message.
 */
export function isSnipBoundaryMessage(message: Message): boolean {
  if (!message || !('content' in message)) return false
  const content = (message as { content?: unknown }).content
  if (typeof content === 'string') {
    return content.includes(SNIP_BOUNDARY_TYPE)
  }
  if (Array.isArray(content)) {
    return content.some(
      (block: { type?: string; text?: string }) =>
        block.type === 'text' && typeof block.text === 'string' && block.text.includes(SNIP_BOUNDARY_TYPE),
    )
  }
  return false
}

/**
 * Project the snipped view — filter out snipped messages,
 * keeping only boundary markers and live content.
 */
export function projectSnippedView<T extends Message>(messages: T[]): T[] {
  // In the simplified version, no messages are snipped, so return as-is
  return messages
}
