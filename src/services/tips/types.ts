/**
 * Stub type definitions for tips types.
 */

export interface TipContext {
  [key: string]: any
}

export interface Tip {
  id: string
  content: (context?: TipContext) => Promise<string>
  cooldownSessions: number
  isRelevant: (context?: TipContext) => Promise<boolean>
  [key: string]: any
}
