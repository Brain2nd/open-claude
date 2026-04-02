/**
 * Reactive Compact — triggers compaction when a 413 prompt-too-long
 * error is received during streaming.
 *
 * Feature gate: REACTIVE_COMPACT
 */

import type { Message } from '../../types/message.js'
import {
  compactConversation,
  type CompactionResult,
  ERROR_MESSAGE_NOT_ENOUGH_MESSAGES,
  ERROR_MESSAGE_USER_ABORT,
  ERROR_MESSAGE_INCOMPLETE_RESPONSE,
} from './compact.js'
import type { ToolUseContext } from '../../Tool.js'
import type { CacheSafeParams } from '../../utils/forkedAgent.js'
import { logError } from '../../utils/log.js'

export function isReactiveCompactEnabled(): boolean {
  return true
}

/**
 * Reactive-only mode means /compact always routes through the reactive path
 * instead of the standard compactConversation. Disabled — we use the standard path.
 */
export function isReactiveOnlyMode(): boolean {
  return false
}

/**
 * Attempt reactive compaction when a 413 is withheld during the query loop.
 * Returns a CompactionResult on success, or null if compaction was not possible.
 */
export async function tryReactiveCompact(config: {
  hasAttempted: boolean
  querySource: unknown
  aborted: boolean
  messages: Message[]
  cacheSafeParams: {
    systemPrompt: unknown
    userContext: string
    systemContext: string
    toolUseContext: unknown
    forkContextMessages: Message[]
  }
}): Promise<CompactionResult | null> {
  if (config.hasAttempted || config.aborted) {
    return null
  }

  try {
    const result = await compactConversation(
      config.messages,
      config.cacheSafeParams.toolUseContext as ToolUseContext,
      config.cacheSafeParams as unknown as CacheSafeParams,
      true, // suppressFollowUpQuestions
      undefined, // customInstructions
      false, // isAutoCompact
    )
    return result
  } catch (error) {
    logError(error as Error)
    return null
  }
}

type ReactiveOutcome =
  | { ok: true; result: CompactionResult }
  | { ok: false; reason: 'too_few_groups' | 'aborted' | 'exhausted' | 'error' | 'media_unstrippable' }

/**
 * Reactive compaction triggered by a prompt-too-long error.
 * Used by /compact when isReactiveOnlyMode() is true.
 */
export async function reactiveCompactOnPromptTooLong(
  messages: Message[],
  cacheSafeParams: CacheSafeParams,
  options?: {
    customInstructions?: string
    trigger?: string
  },
): Promise<ReactiveOutcome> {
  try {
    // We need a ToolUseContext but don't have one in this code path.
    // Since isReactiveOnlyMode() returns false, this function should
    // not be called from the /compact command. Provide a safe fallback.
    const result = await compactConversation(
      messages,
      {} as ToolUseContext,
      cacheSafeParams,
      true, // suppressFollowUpQuestions
      options?.customInstructions,
      false, // isAutoCompact
    )
    return { ok: true, result }
  } catch (error) {
    const msg = (error as Error).message
    if (msg === ERROR_MESSAGE_NOT_ENOUGH_MESSAGES) {
      return { ok: false, reason: 'too_few_groups' }
    }
    if (msg === ERROR_MESSAGE_USER_ABORT) {
      return { ok: false, reason: 'aborted' }
    }
    if (msg === ERROR_MESSAGE_INCOMPLETE_RESPONSE) {
      return { ok: false, reason: 'exhausted' }
    }
    logError(error as Error)
    return { ok: false, reason: 'error' }
  }
}

/**
 * Check if a withheld message is a 413 prompt-too-long error.
 */
export function isWithheldPromptTooLong(message: unknown): boolean {
  if (!message || typeof message !== 'object') return false
  const msg = message as Record<string, unknown>
  if ('error' in msg) {
    const err = msg.error as Record<string, unknown>
    return (
      err?.type === 'error' &&
      (err?.error as Record<string, unknown>)?.type === 'prompt_too_long'
    )
  }
  return false
}

/**
 * Check if a withheld message is a media size error.
 */
export function isWithheldMediaSizeError(message: unknown): boolean {
  if (!message || typeof message !== 'object') return false
  const msg = message as Record<string, unknown>
  if ('error' in msg) {
    const err = msg.error as Record<string, unknown>
    return (
      err?.type === 'error' &&
      (err?.error as Record<string, unknown>)?.type === 'invalid_request_error'
    )
  }
  return false
}
