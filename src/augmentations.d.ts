/**
 * Module augmentations — these add missing members to existing module declarations.
 * This file contains an `export {}` to make it a module, which ensures
 * `declare module` augments rather than replaces existing declarations.
 */
export {}


declare module 'react-reconciler/constants.js' {
  export const NoEventPriority: number
  export const ContinuousEventPriority: number
  export const DefaultEventPriority: number
  export const DiscreteEventPriority: number
  export const ConcurrentRoot: number
  export const LegacyRoot: number
}
