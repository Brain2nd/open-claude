/**
 * Global singleton managing the SSH proxy activation state.
 *
 * When active, tools query getSSHProxyManager() to decide whether to
 * redirect filesystem/shell/git operations to the remote host.
 * When null, everything runs locally as usual.
 *
 * Feature gate: SSH_PROXY
 */

import type { SSHConnectionManager } from './SSHConnectionManager.js'

let activeProxy: SSHConnectionManager | null = null

export function activateSSHProxy(conn: SSHConnectionManager): void {
  activeProxy = conn
}

export function deactivateSSHProxy(): void {
  activeProxy = null
}

export function getSSHProxyManager(): SSHConnectionManager | null {
  return activeProxy
}

export function isSSHProxyActive(): boolean {
  return activeProxy !== null
}
