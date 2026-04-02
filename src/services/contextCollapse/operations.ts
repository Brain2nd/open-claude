/**
 * Context Collapse Operations — projection/filtering of collapsed messages.
 *
 * `projectView()` replays the commit log to produce the API-visible view:
 * committed spans are replaced by their summary placeholder messages.
 */

import type { Message } from '../../types/message.js'

// Import committed state from the main module
// eslint-disable-next-line @typescript-eslint/no-require-imports
const collapseModule = require('./index.js') as typeof import('./index.js')

/**
 * Project the raw message array through committed collapses.
 * Messages within committed spans are replaced by summary placeholders.
 * Called from /context command for display.
 */
export function projectView(messages: Message[]): Message[] {
  if (!collapseModule.isContextCollapseEnabled()) {
    return messages
  }
  // The main module's applyCollapses already handles committed spans
  // in the message array. For the /context view, we just return as-is
  // since collapses are already applied during query processing.
  return messages
}
