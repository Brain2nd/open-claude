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

// Wrapper around createServer from the open-source package.
// The original ant version accepted (adapter, coordinateMode) but the open-source
// version takes no arguments.
import { createServer as _createServer } from 'computer-use-mcp/dist/index.js'
export function createComputerUseMcpServer(..._args: any[]) {
  return _createServer()
}

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
export function bindSessionContext(..._args: any[]): any {
  return () => ({})
}

export const API_RESIZE_PARAMS = { width: 1280, height: 800 }

export function targetImageSize(
  _width: number,
  _height: number,
  ..._rest: any[]
): [number, number] {
  return [1280, 800]
}

export const DEFAULT_GRANT_FLAGS: any = {}

export type ComputerUseSessionContext = Record<string, unknown>
export type CuCallToolResult = { telemetry?: any; [key: string]: any }
export type CuPermissionRequest = unknown
export type CuPermissionResponse = unknown
export type ScreenshotDims = { width: number; height: number; displayId?: string; [key: string]: any }
export type ComputerExecutor = any
export type DisplayGeometry = any
export type FrontmostApp = any
export type InstalledApp = any
export type ResolvePrepareCaptureResult = any
export type RunningApp = any
export type ScreenshotResult = any
