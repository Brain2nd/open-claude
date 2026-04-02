/**
 * useProactive — React hook that manages the proactive tick loop.
 *
 * When proactive mode is active and the model is idle, this hook
 * periodically injects tick messages into the REPL's message queue.
 *
 * Feature gate: PROACTIVE || KAIROS
 */

import { useEffect, useRef } from 'react'
import {
  isProactiveActive,
  isProactivePaused,
  getNextTickAt,
} from './index.js'

type UseProactiveProps = {
  isLoading: boolean
  queuedCommandsLength: number
  hasActiveLocalJsxUI?: boolean
  isInPlanMode?: boolean
  onSubmitTick?: (prompt: string) => void
  onQueueTick?: (prompt: string) => void
}

/**
 * Manages the proactive tick injection lifecycle.
 * When the model is idle and proactive is active, schedules tick injections.
 */
export function useProactive(props: UseProactiveProps): void {
  const {
    isLoading,
    queuedCommandsLength,
    hasActiveLocalJsxUI = false,
    isInPlanMode = false,
    onSubmitTick,
  } = props

  const lastTickRef = useRef(0)

  useEffect(() => {
    if (!isProactiveActive() || isProactivePaused()) return
    if (isLoading || queuedCommandsLength > 0) return
    if (hasActiveLocalJsxUI || isInPlanMode) return

    const nextTick = getNextTickAt()
    if (!nextTick) return

    const delay = Math.max(0, nextTick - Date.now())
    const timer = setTimeout(() => {
      if (Date.now() - lastTickRef.current < 30_000) return // Debounce 30s
      lastTickRef.current = Date.now()
      onSubmitTick?.('<tick/>')
    }, delay)

    return () => clearTimeout(timer)
  }, [isLoading, queuedCommandsLength, hasActiveLocalJsxUI, isInPlanMode, onSubmitTick])
}
