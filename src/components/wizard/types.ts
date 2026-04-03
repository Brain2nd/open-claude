/**
 * Stub type definitions for wizard types.
 */

import type { ReactNode } from 'react'

export interface WizardContextValue<T extends Record<string, unknown> = Record<string, unknown>> {
  data: T
  setData: (data: Partial<T>) => void
  currentStepIndex: number
  totalSteps: number
  goNext: () => void
  goBack: () => void
  goToStep: (index: number) => void
  complete: () => void
  cancel: () => void
  title?: string
  showStepCounter: boolean
  [key: string]: any
}

export interface WizardProviderProps<T extends Record<string, unknown> = Record<string, unknown>> {
  steps: WizardStepComponent[]
  initialData?: T
  onComplete: (data: T) => void
  onCancel: () => void
  children: ReactNode
  title?: string
  showStepCounter?: boolean
}

export type WizardStepComponent = React.ComponentType<any>
