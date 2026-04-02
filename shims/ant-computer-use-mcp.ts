/**
 * Shim: @ant/computer-use-mcp → computer-use-mcp (open-source)
 *
 * Maps the internal Anthropic API surface to the open-source computer-use-mcp
 * package by domdomegg. The open-source version uses @nut-tree-fork/nut-js for
 * cross-platform mouse/keyboard control and screen capture.
 *
 * Not all features are 1:1 — the internal version has macOS-specific Swift
 * bindings and sentinel app classification. This shim provides the subset
 * needed for basic computer-use functionality.
 */

// Re-export createServer from the open-source package as createComputerUseMcpServer
// computer-use-mcp exports createServer from dist/index.js
export { createServer as createComputerUseMcpServer } from 'computer-use-mcp/dist/index.js'

// Stub for buildComputerUseTools — the open-source version registers tools
// internally via registerAll(), so this returns an empty array. The actual
// tools are exposed through the MCP server's ListTools handler.
export function buildComputerUseTools(
  _capabilities?: unknown,
  _coordinateMode?: unknown,
  _installedAppNames?: string[],
): Array<{ name: string; description: string; inputSchema: unknown }> {
  return []
}

// Stubs for features that don't exist in the open-source version
export function bindSessionContext(_ctx: unknown): unknown {
  return {}
}

export const API_RESIZE_PARAMS = { width: 1280, height: 800 }

export function targetImageSize(
  _width: number,
  _height: number,
): { width: number; height: number } {
  return { width: 1280, height: 800 }
}

export const DEFAULT_GRANT_FLAGS = 0

export type ComputerUseSessionContext = Record<string, unknown>
export type CuCallToolResult = unknown
export type CuPermissionRequest = unknown
export type CuPermissionResponse = unknown
export type ScreenshotDims = { width: number; height: number }
