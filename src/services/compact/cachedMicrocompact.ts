/**
 * Cached Microcompact — manages cache-editing of tool results.
 *
 * Tracks tool results per-message and queues cache edits for deletion
 * of old results, reducing context window usage without full compaction.
 *
 * Feature gate: CACHED_MICROCOMPACT
 */

export type CacheEditsBlock = {
  type: 'cache_edits'
  edits: Array<{ toolUseId: string; action: 'delete' }>
}

export type PinnedCacheEdits = {
  userMessageIndex: number
  block: CacheEditsBlock
}

export type CachedMCState = {
  registeredTools: Set<string>
  pinnedEdits: PinnedCacheEdits[]
  toolOrder: string[]
  deletedRefs: Set<string>
}

/**
 * Returns the cached microcompact configuration.
 */
export function getCachedMCConfig(): {
  supportedModels?: string[]
  triggerCount?: number
  triggerThreshold?: number
  keepCount?: number
  keepRecent?: number
} {
  return {
    supportedModels: [
      'claude-sonnet-4-6',
      'claude-opus-4-6',
      'claude-haiku-4-5',
    ],
    triggerCount: 5,
    triggerThreshold: 5,
    keepCount: 3,
    keepRecent: 3,
  }
}

export function isCachedMicrocompactEnabled(): boolean {
  return false
}

export function isModelSupportedForCacheEditing(_model: string): boolean {
  const config = getCachedMCConfig()
  return config.supportedModels?.includes(_model) ?? false
}

export function createCachedMCState(): CachedMCState {
  return {
    registeredTools: new Set(),
    pinnedEdits: [],
    toolOrder: [],
    deletedRefs: new Set(),
  }
}

export function resetCachedMCState(state: CachedMCState): void {
  state.registeredTools.clear()
  state.pinnedEdits = []
  state.toolOrder = []
  state.deletedRefs.clear()
}

export function registerToolResult(
  state: CachedMCState,
  toolUseId: string,
): void {
  state.registeredTools.add(toolUseId)
  state.toolOrder.push(toolUseId)
}

export function registerToolMessage(
  _state: CachedMCState,
  _groupIds: string[],
): void {
  // Track grouped tool messages for cache editing
}

/**
 * Determine which tool results should be deleted based on the
 * trigger threshold and keep-recent settings.
 */
export function getToolResultsToDelete(state: CachedMCState): string[] {
  const config = getCachedMCConfig()
  const trigger = config.triggerThreshold ?? config.triggerCount ?? 5
  const keep = config.keepRecent ?? config.keepCount ?? 3

  // Only trigger if we have enough tool results
  if (state.toolOrder.length < trigger) {
    return []
  }

  // Delete all but the most recent `keep` tool results
  const candidates = state.toolOrder.filter(
    (id) => !state.deletedRefs.has(id),
  )

  if (candidates.length <= keep) {
    return []
  }

  return candidates.slice(0, candidates.length - keep)
}

/**
 * Mark tools as sent to the API. Called after a successful API response
 * so that future cache-edit blocks correctly reference already-sent tools.
 */
export function markToolsSentToAPI(state: CachedMCState): void {
  // All currently registered tools have been sent
  // Track them so getToolResultsToDelete can identify stale ones
  for (const id of state.registeredTools) {
    if (!state.toolOrder.includes(id)) {
      state.toolOrder.push(id)
    }
  }
}

export function createCacheEditsBlock(
  state: CachedMCState,
  toolsToDelete: string[],
): CacheEditsBlock {
  // Mark as deleted
  for (const id of toolsToDelete) {
    state.deletedRefs.add(id)
  }

  return {
    type: 'cache_edits',
    edits: toolsToDelete
      .filter((id) => state.registeredTools.has(id))
      .map((toolUseId) => ({ toolUseId, action: 'delete' as const })),
  }
}
