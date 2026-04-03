/**
 * Stub type definitions for keybinding types.
 */

export type KeybindingContextName =
  | 'Global'
  | 'Chat'
  | 'Task'
  | 'Permission'
  | 'Dialog'
  | 'MessageActions'
  | string

export type KeybindingAction = string

export interface ParsedKeystroke {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
  super: boolean
}

export type Chord = ParsedKeystroke[]

export interface ParsedBinding {
  chord: Chord
  action: string | null
  context: KeybindingContextName
}

export interface KeybindingBlock {
  context: KeybindingContextName
  bindings: Record<string, string | null>
}
