/**
 * Stub type definitions for plugin command types.
 */

export type ViewState = any

export interface PluginSettingsProps {
  onDone: (message: string) => void
  [key: string]: any
}
