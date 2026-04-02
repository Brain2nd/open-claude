/**
 * Shim: @ant/computer-use-mcp/sentinelApps
 *
 * Sentinel classification assigns safety tiers to apps (e.g. terminals get
 * "shell access" warnings). The open-source computer-use-mcp doesn't have
 * this — return "unknown" for all apps so the UI can still render.
 */
export function getSentinelCategory(_appName: string): string {
  return 'unknown'
}
