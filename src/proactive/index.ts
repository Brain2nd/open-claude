/**
 * Proactive Agent — AI-initiated actions between user turns.
 *
 * When active, Claude can initiate "ticks" at scheduled intervals to
 * perform background work (monitoring, reminders, etc.) without
 * waiting for user input.
 *
 * Feature gate: PROACTIVE || KAIROS
 */

// ============================================================================
// Module State
// ============================================================================

let active = false
let paused = false
let contextBlocked = false
let nextTickAt: number | null = null
const subscribers = new Set<() => void>()

const DEFAULT_TICK_INTERVAL_MS = 60_000 // 1 minute
let tickTimer: ReturnType<typeof setTimeout> | null = null

function notify(): void {
  for (const cb of subscribers) {
    try { cb() } catch { /* subscriber error */ }
  }
}

function scheduleNextTick(): void {
  if (tickTimer) clearTimeout(tickTimer)
  if (!active || paused || contextBlocked) {
    nextTickAt = null
    return
  }
  nextTickAt = Date.now() + DEFAULT_TICK_INTERVAL_MS
  tickTimer = setTimeout(() => {
    // Tick fires — will be consumed by useProactive hook
    notify()
    scheduleNextTick()
  }, DEFAULT_TICK_INTERVAL_MS)
}

// ============================================================================
// Public API
// ============================================================================

export function isProactiveActive(): boolean {
  return active
}

export function activateProactive(_source: string): void {
  if (active) return
  active = true
  paused = false
  contextBlocked = false
  scheduleNextTick()
  notify()
}

export function deactivateProactive(): void {
  active = false
  paused = false
  if (tickTimer) clearTimeout(tickTimer)
  tickTimer = null
  nextTickAt = null
  notify()
}

export function pauseProactive(): void {
  if (!active) return
  paused = true
  if (tickTimer) clearTimeout(tickTimer)
  tickTimer = null
  nextTickAt = null
  notify()
}

export function resumeProactive(): void {
  if (!active) return
  paused = false
  scheduleNextTick()
  notify()
}

export function isProactivePaused(): boolean {
  return paused
}

export function setContextBlocked(blocked: boolean): void {
  contextBlocked = blocked
  if (blocked) {
    if (tickTimer) clearTimeout(tickTimer)
    tickTimer = null
    nextTickAt = null
  } else if (active && !paused) {
    scheduleNextTick()
  }
  notify()
}

/**
 * React external store subscription — used with useSyncExternalStore.
 */
export function subscribeToProactiveChanges(cb: () => void): () => void {
  subscribers.add(cb)
  return () => { subscribers.delete(cb) }
}

/**
 * Returns the timestamp of the next scheduled tick, or null.
 * Used by UI to show countdown.
 */
export function getNextTickAt(): number | null {
  return nextTickAt
}

/**
 * Get the proactive system prompt section.
 * Called from constants/prompts.ts and services/compact/prompt.ts.
 */
export function getProactivePromptSection(): string {
  if (!active) return ''
  return `
You have proactive mode enabled. Between user turns, you may receive
<tick> messages indicating you can perform background work such as
monitoring, checking status, or preparing suggestions.
`.trim()
}
