/**
 * Global singleton managing the SSH proxy activation state.
 *
 * Uses globalThis to ensure the same instance is shared across all
 * module copies (dynamic import vs static import can create separate
 * module instances in Bun's bundler).
 *
 * Feature gate: SSH_PROXY
 */

import type { SSHConnectionManager } from './SSHConnectionManager.js'

const GLOBAL_KEY = '__openclaude_ssh_proxy__' as const

// Store on globalThis so dynamic and static imports share the same state
function getGlobal(): { proxy: SSHConnectionManager | null } {
  if (!(globalThis as any)[GLOBAL_KEY]) {
    (globalThis as any)[GLOBAL_KEY] = { proxy: null }
  }
  return (globalThis as any)[GLOBAL_KEY]
}

export function activateSSHProxy(conn: SSHConnectionManager): void {
  getGlobal().proxy = conn
}

export function deactivateSSHProxy(): void {
  getGlobal().proxy = null
}

export function getSSHProxyManager(): SSHConnectionManager | null {
  return getGlobal().proxy
}

export function isSSHProxyActive(): boolean {
  return getGlobal().proxy !== null
}
