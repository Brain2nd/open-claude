/**
 * Cached MC (Microcompact) Configuration.
 *
 * Provides configuration for the microcompact system, which manages
 * cache-editing of tool results to reduce context window usage.
 *
 * Feature gate: CACHED_MICROCOMPACT
 */

let cachedConfig: Record<string, unknown> | null = null

/**
 * Returns the cached microcompact configuration.
 * Reads from GrowthBook feature values with sensible defaults.
 */
export function getCachedMCConfig(): {
  supportedModels?: string[]
  triggerCount?: number
  keepCount?: number
} {
  if (cachedConfig) return cachedConfig as ReturnType<typeof getCachedMCConfig>

  cachedConfig = {
    supportedModels: [
      'claude-sonnet-4-6',
      'claude-opus-4-6',
      'claude-haiku-4-5',
    ],
    triggerCount: 5,
    keepCount: 3,
  }
  return cachedConfig as ReturnType<typeof getCachedMCConfig>
}
