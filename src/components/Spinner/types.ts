/**
 * Stub type definitions for Spinner component types.
 */

export type SpinnerMode =
  | 'thinking'
  | 'streaming'
  | 'tool_use'
  | 'stalled'
  | 'error'
  | string

export interface RGBColor {
  r: number
  g: number
  b: number
}
