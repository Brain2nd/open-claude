/**
 * Context Collapse — manages collapsing old message spans into compact summaries.
 *
 * When conversations grow long, old tool-use/result pairs (file reads, searches,
 * etc.) become low-value. This module identifies those spans, generates summaries,
 * and replaces the original messages with compact placeholder messages.
 *
 * Two phases:
 * 1. **Staging**: spans are identified and queued with summaries during
 *    `applyCollapsesIfNeeded()`. Staged collapses are applied to the API messages
 *    immediately but can be rolled back.
 * 2. **Committing**: staged collapses become permanent when the conversation
 *    continues. Committed collapses are persisted to the transcript log.
 *
 * On 413 overflow, `recoverFromOverflow()` aggressively drains the staged queue
 * to free tokens.
 */

import type { UUID } from 'crypto'
import type { Message } from '../../types/message.js'
import type {
  ContextCollapseCommitEntry,
  ContextCollapseSnapshotEntry,
} from '../../types/logs.js'

// ============================================================================
// Types
// ============================================================================

type StagedCollapse = {
  collapseId: string
  startUuid: string
  endUuid: string
  summary: string
  summaryUuid: string
  summaryContent: string
  risk: number
  stagedAt: number
}

type CommittedCollapse = {
  collapseId: string
  summaryUuid: string
  summaryContent: string
  summary: string
  firstArchivedUuid: string
  lastArchivedUuid: string
}

type CollapseStats = {
  collapsedSpans: number
  stagedSpans: number
  collapsedMessages: number
  health: {
    totalSpawns: number
    totalErrors: number
    totalEmptySpawns: number
    emptySpawnWarningEmitted: boolean
    lastError?: string
  }
}

// ============================================================================
// Module State
// ============================================================================

let enabled = false
let idCounter = 0
const committed: CommittedCollapse[] = []
const staged: StagedCollapse[] = []
const subscribers = new Set<() => void>()
let totalSpawns = 0
let totalErrors = 0
let collapsedMessageCount = 0

function notify(): void {
  for (const cb of subscribers) {
    try { cb() } catch { /* subscriber error */ }
  }
}

function nextId(): string {
  return String(++idCounter).padStart(16, '0')
}

// ============================================================================
// Public API
// ============================================================================

export function isContextCollapseEnabled(): boolean {
  return enabled
}

export function initContextCollapse(): void {
  enabled = true
}

export function resetContextCollapse(): void {
  staged.length = 0
  committed.length = 0
  idCounter = 0
  totalSpawns = 0
  totalErrors = 0
  collapsedMessageCount = 0
  notify()
}

export function getStats(): CollapseStats {
  return {
    collapsedSpans: committed.length,
    stagedSpans: staged.length,
    collapsedMessages: collapsedMessageCount,
    health: {
      totalSpawns,
      totalErrors,
      totalEmptySpawns: 0,
      emptySpawnWarningEmitted: false,
    },
  }
}

/**
 * React external store subscription — used with useSyncExternalStore.
 */
export function subscribe(cb: () => void): () => void {
  subscribers.add(cb)
  return () => { subscribers.delete(cb) }
}

/**
 * Identify collapsible spans in the message array and replace them with
 * summary placeholders. Returns the modified message array.
 *
 * Collapsible spans are sequences of tool-use + tool-result messages that
 * are far enough back in the conversation to be low-value for the model's
 * current context.
 */
export async function applyCollapsesIfNeeded(
  messages: Message[],
  _toolUseContext: unknown,
  _querySource: unknown,
): Promise<{ messages: Message[] }> {
  if (!enabled || messages.length < 10) {
    return { messages }
  }

  // Find tool-use/result pairs in the first half of the conversation
  const halfPoint = Math.floor(messages.length / 2)
  const result = [...messages]
  let modified = false

  for (let i = 0; i < halfPoint; i++) {
    const msg = result[i]
    if (!msg) continue

    // Look for assistant messages with tool_use blocks followed by tool results
    if ('role' in msg && msg.role === 'assistant' && 'content' in msg && Array.isArray(msg.content)) {
      const hasToolUse = msg.content.some(
        (block: { type?: string }) => block.type === 'tool_use',
      )
      if (!hasToolUse) continue

      // Check if next message is a tool result
      const nextMsg = result[i + 1]
      if (!nextMsg || !('role' in nextMsg) || nextMsg.role !== 'user') continue

      const nextContent = 'content' in nextMsg && Array.isArray(nextMsg.content)
        ? nextMsg.content
        : []
      const hasToolResult = nextContent.some(
        (block: { type?: string }) => block.type === 'tool_result',
      )
      if (!hasToolResult) continue

      // Check if this pair is already staged or committed
      const msgUuid = ('uuid' in msg ? msg.uuid : undefined) as string | undefined
      const nextUuid = ('uuid' in nextMsg ? nextMsg.uuid : undefined) as string | undefined
      if (!msgUuid || !nextUuid) continue

      const alreadyHandled =
        committed.some(c => c.firstArchivedUuid === msgUuid) ||
        staged.some(s => s.startUuid === msgUuid)
      if (alreadyHandled) continue

      // Stage this pair for collapse
      const collapseId = nextId()
      const summaryUuid = crypto.randomUUID() as string
      const toolNames = msg.content
        .filter((b: { type?: string }) => b.type === 'tool_use')
        .map((b: { name?: string }) => b.name || 'unknown')
        .join(', ')
      const summary = `[Collapsed: ${toolNames} tool call and result]`
      const summaryContent = `<collapsed id="${collapseId}">${summary}</collapsed>`

      staged.push({
        collapseId,
        startUuid: msgUuid,
        endUuid: nextUuid,
        summary,
        summaryUuid,
        summaryContent,
        risk: 0.1,
        stagedAt: Date.now(),
      })

      modified = true
      totalSpawns++
    }
  }

  if (modified) {
    // Apply staged collapses to messages
    const filtered = applyCollapses(result)
    notify()
    return { messages: filtered }
  }

  return { messages }
}

/**
 * On 413 overflow, aggressively drain staged collapses and commit them.
 */
export function recoverFromOverflow(
  messages: Message[],
  _querySource: unknown,
): { committed: number; messages: Message[] } {
  if (staged.length === 0) {
    return { committed: 0, messages }
  }

  // Commit all staged collapses
  const count = staged.length
  for (const s of staged) {
    committed.push({
      collapseId: s.collapseId,
      summaryUuid: s.summaryUuid,
      summaryContent: s.summaryContent,
      summary: s.summary,
      firstArchivedUuid: s.startUuid,
      lastArchivedUuid: s.endUuid,
    })
  }
  staged.length = 0

  const filtered = applyCollapses([...messages])
  collapsedMessageCount += count * 2 // Each collapse removes ~2 messages
  notify()
  return { committed: count, messages: filtered }
}

/**
 * Check if a withheld 413 can be recovered by draining collapses.
 */
export function isWithheldPromptTooLong(
  _message: unknown,
  _isPromptTooLong: (msg: unknown) => boolean,
  _querySource: unknown,
): boolean {
  return staged.length > 0
}

// ============================================================================
// Internal helpers
// ============================================================================

function applyCollapses(messages: Message[]): Message[] {
  // Build a set of UUIDs to remove
  const allCollapses = [...committed, ...staged.map(s => ({
    firstArchivedUuid: s.startUuid,
    lastArchivedUuid: s.endUuid,
    summaryContent: s.summaryContent,
    summaryUuid: s.summaryUuid,
  }))]

  const uuidsToRemove = new Set<string>()
  const insertions = new Map<number, { uuid: string; content: string }>()

  for (const collapse of allCollapses) {
    let inSpan = false
    let spanStart = -1
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      const uuid = msg && 'uuid' in msg ? (msg as { uuid?: string }).uuid : undefined
      if (uuid === collapse.firstArchivedUuid) {
        inSpan = true
        spanStart = i
      }
      if (inSpan && uuid) {
        uuidsToRemove.add(uuid)
      }
      if (uuid === collapse.lastArchivedUuid) {
        inSpan = false
        // Insert summary at the position of the first removed message
        if (spanStart >= 0) {
          insertions.set(spanStart, {
            uuid: collapse.summaryUuid,
            content: collapse.summaryContent,
          })
        }
        break
      }
    }
  }

  // Build new message array
  const result: Message[] = []
  for (let i = 0; i < messages.length; i++) {
    const insertion = insertions.get(i)
    if (insertion) {
      // Insert a system message as the collapse summary placeholder
      result.push({
        role: 'user',
        uuid: insertion.uuid as UUID,
        content: [{ type: 'text', text: insertion.content }],
        type: 'user',
      } as unknown as Message)
    }

    const msg = messages[i]
    const uuid = msg && 'uuid' in msg ? (msg as { uuid?: string }).uuid : undefined
    if (uuid && uuidsToRemove.has(uuid)) {
      continue // Skip archived messages
    }
    result.push(msg!)
  }

  return result
}
