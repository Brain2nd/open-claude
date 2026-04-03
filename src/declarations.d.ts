/**
 * Module declarations for external/native modules and non-TS imports.
 */

// React compiler runtime (used by React Compiler output)
declare module 'react/compiler-runtime' {
  export function c(size: number): any[]
}

// Native NAPI modules (excluded from bundle)
declare module 'image-processor-napi' {
  const mod: any
  export default mod
  export const processImage: any
  export const getImageSize: any
  export function getNativeModule(): any
  export function sharp(...args: any[]): any
}

declare module 'url-handler-napi' {
  const mod: any
  export default mod
  export const registerProtocolHandler: any
  export function waitForUrlEvent(...args: any[]): any
}

// Markdown file imports (used by skills)
declare module '*.md' {
  const content: string
  export default content
}

// Augment @anthropic-ai/mcpb with missing types
declare module '@anthropic-ai/mcpb' {
  export type McpbUserConfigurationOption = any
  export type McpbManifest = any
  export const McpbManifestSchema: any
  export function getMcpConfigForManifest(...args: any[]): any
}

// Build-time MACRO globals injected by bun build --define
declare const MACRO: {
  VERSION: string
  BUILD_TIME: string
  PACKAGE_URL: string
  FEEDBACK_CHANNEL: string
  [key: string]: any
}



