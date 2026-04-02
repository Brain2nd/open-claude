/**
 * Shim: @ant/computer-use-input
 *
 * The internal package provides Rust/enigo-based native keyboard and mouse
 * input. The open-source computer-use-mcp handles input via
 * @nut-tree-fork/nut-js, so this shim is a no-op stub.
 */
export function key(_k: string): void {}
export function keys(_k: string[]): void {}
