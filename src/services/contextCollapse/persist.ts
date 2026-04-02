/**
 * Context Collapse Persistence — restore collapse state from transcript log.
 *
 * On session resume, `restoreFromEntries()` replays persisted commit entries
 * and the latest snapshot to reconstruct the collapse state machine.
 */

import type {
  ContextCollapseCommitEntry,
  ContextCollapseSnapshotEntry,
} from '../../types/logs.js'

/**
 * Restore collapse state from persisted transcript entries.
 * Called during session resume from sessionRestore.ts and ResumeConversation.tsx.
 *
 * @param commits - Ordered commit entries from the transcript JSONL
 * @param snapshot - Latest snapshot entry (staged queue + spawn state), if any
 */
export function restoreFromEntries(
  _commits: ContextCollapseCommitEntry[],
  _snapshot?: ContextCollapseSnapshotEntry,
): void {
  // Import the main module to access its state
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const collapseModule = require('./index.js') as typeof import('./index.js')

  // Initialize if not already done
  if (!collapseModule.isContextCollapseEnabled()) {
    collapseModule.initContextCollapse()
  }

  // Commits are replayed by the main module's applyCollapses during
  // the next query cycle. The commit entries contain all the info
  // needed to reconstruct the collapsed view (firstArchivedUuid,
  // lastArchivedUuid, summaryContent).
  //
  // For a full implementation, we would:
  // 1. Rebuild committedCollapses[] from commit entries
  // 2. Restore staged[] from snapshot.staged
  // 3. Reseed idCounter from max collapseId
  //
  // This is a simplified version that relies on the collapses
  // already being applied in the resumed message array.
}
