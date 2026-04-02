/**
 * SDK utility types that can't be expressed as Zod schemas.
 */
import type { ModelUsage } from './coreTypes.generated.js'

/** ModelUsage with all fields guaranteed non-null */
export type NonNullableUsage = Required<ModelUsage>
