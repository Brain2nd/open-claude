/**
 * Type declarations for the `bun:bundle` module.
 *
 * In the official Bun build pipeline, `feature(name)` is resolved at compile
 * time and replaced with a boolean literal so the bundler can dead-code
 * eliminate unreachable branches.
 *
 * For secondary development we provide a runtime shim (bun-bundle.ts) that
 * reads a feature-flags configuration object so the same source code works
 * without modification.
 */
declare module 'bun:bundle' {
  export function feature(name: string): boolean
}
