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
}

/**
 * Returns the cached microcompact configuration.
 */
export function getCachedMCConfig(): {
  supportedModels?: string[]
  triggerCount?: number
  keepCount?: number
} {
  return {
    supportedModels: [
      'claude-sonnet-4-6',
      'claude-opus-4-6',
      'claude-haiku-4-5',
    ],
    triggerCount: 5,
    keepCount: 3,
  }
}

export function isCachedMicrocompactEnabled(): boolean {
  return false // Disabled by default, enable when testing
}

export function isModelSupportedForCacheEditing(_model: string): boolean {
  const config = getCachedMCConfig()
  return config.supportedModels?.includes(_model) ?? false
}

export function createCachedMCState(): CachedMCState {
  return {
    registeredTools: new Set(),
    pinnedEdits: [],
  }
}

export function resetCachedMCState(state: CachedMCState): void {
  state.registeredTools.clear()
  state.pinnedEdits = []
}

export function registerToolResult(state: CachedMCState, toolUseId: string): void {
  state.registeredTools.add(toolUseId)
}

export function registerToolMessage(_state: CachedMCState, _groupIds: string[]): void {
  // Track grouped tool messages for cache editing
}

export function createCacheEditsBlock(
  state: CachedMCState,
  toolsToDelete: string[],
): CacheEditsBlock {
  return {
    type: 'cache_edits',
    edits: toolsToDelete
      .filter(id => state.registeredTools.has(id))
      .map(toolUseId => ({ toolUseId, action: 'delete' as const })),
  }
}
