#!/usr/bin/env bun
/**
 * OpenClaude build script — based on free-code's build approach.
 *
 * Uses `bun build --compile --target bun --packages bundle` which:
 * 1. Creates a standalone Bun executable (no Node.js needed at runtime)
 * 2. Bundles ALL dependencies including OpenTelemetry (solves CJS/ESM issues)
 * 3. Supports native `--feature=FLAG` for compile-time DCE
 *
 * Usage:
 *   bun run build-bun.ts              # Production build
 *   bun run build-bun.ts --dev        # Development build (with dev features)
 *   bun run build-bun.ts --compile    # Compile to standalone binary
 */

import { chmodSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

const pkg = await Bun.file(new URL('./package.json', import.meta.url)).json() as {
  name: string
  version: string
}

const args = process.argv.slice(2)
const compile = args.includes('--compile') || !args.includes('--no-compile')
const dev = args.includes('--dev')
const install = args.includes('--install')

// All available feature flags
const enabledFeatures = [
  // Core features — enabled for daily use
  'AUTO_THEME',
  'BASH_CLASSIFIER',
  // 'BUILDING_CLAUDE_APPS', // Requires internal Anthropic .md assets not in public source
  'BUILTIN_EXPLORE_PLAN_AGENTS',
  'COMMIT_ATTRIBUTION',
  'COMPACTION_REMINDERS',
  'CONNECTOR_TEXT',
  // 'CONTEXT_COLLAPSE', // Disabled: stub implementation causes hang in bundled mode
  'DOWNLOAD_USER_SETTINGS',
  'EXTRACT_MEMORIES',
  'FORK_SUBAGENT',
  'HISTORY_PICKER',
  // 'HISTORY_SNIP', // Disabled: stub implementation causes hang in bundled mode
  'HOOK_PROMPTS',
  'MCP_RICH_OUTPUT',
  'MCP_SKILLS',
  'MESSAGE_ACTIONS',
  'REACTIVE_COMPACT',
  'SKIP_DETECTION_WHEN_AUTOUPDATES_DISABLED',
  'STREAMLINED_OUTPUT',
  'TEAMMEM',
  'TOKEN_BUDGET',
  'ULTRAPLAN',
  'ULTRATHINK',
  'UPLOAD_USER_SETTINGS',
  'UNATTENDED_RETRY',
  'VERIFICATION_AGENT',
  // Optional features — add more as needed
  'QUICK_SEARCH',
  'SHOT_STATS',
  'PROMPT_CACHE_BREAK_DETECTION',
  'NATIVE_CLIPBOARD_IMAGE',
  'LODESTONE',
  'NEW_INIT',
  'POWERSHELL_AUTO_MODE',
  'TREE_SITTER_BASH',
  'TREE_SITTER_BASH_SHADOW',
  'BUDDY',
]

// Additional dev features
if (dev) {
  enabledFeatures.push(
    'AGENT_MEMORY_SNAPSHOT',
    'AGENT_TRIGGERS',
    'AGENT_TRIGGERS_REMOTE',
    'AWAY_SUMMARY',
    'BG_SESSIONS',
    'BRIDGE_MODE',
    'BUDDY',
    'CACHED_MICROCOMPACT',
    'CCR_AUTO_CONNECT',
    'CCR_MIRROR',
    'CCR_REMOTE_SETUP',
    'DAEMON',
    'DIRECT_CONNECT',
    'KAIROS',
    'KAIROS_BRIEF',
    'KAIROS_CHANNELS',
    'PROACTIVE',
    'SSH_REMOTE',
    'VOICE_MODE',
    'WORKFLOW_SCRIPTS',
  )
}

// Parse --feature=FLAG from command line
for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--feature' && args[i + 1]) {
    enabledFeatures.push(args[i + 1]!)
    i++
  } else if (arg.startsWith('--feature=')) {
    enabledFeatures.push(arg.slice('--feature='.length))
  }
}

const features = [...new Set(enabledFeatures)]

const version = pkg.version || '0.0.1'
const buildTime = new Date().toISOString()
const outfile = compile
  ? (dev ? './dist/cli-dev' : './dist/cli')
  : (dev ? './cli-dev.js' : './cli.js')

const outDir = dirname(outfile)
if (outDir !== '.') {
  mkdirSync(outDir, { recursive: true })
}

console.log(`Building OpenClaude v${version} (${dev ? 'development' : 'production'})...`)
console.log(`Features: ${features.length} enabled`)

// External packages — native binaries that can't be bundled
// NOTE: @ant/* packages are NOT external — they're shimmed in node_modules/@ant/
// and bundled directly. Only native NAPI modules need to be external.
const externals = [
  'audio-capture-napi',
  'image-processor-napi',
  'modifiers-napi',
  'url-handler-napi',
]

// Build-time defines
const defines: Record<string, string> = {
  'process.env.USER_TYPE': JSON.stringify('external'),
  'process.env.CLAUDE_CODE_FORCE_FULL_LOGO': JSON.stringify('true'),
  'process.env.CLAUDE_CODE_VERIFY_PLAN': JSON.stringify('false'),
  'process.env.CCR_FORCE_BUNDLE': JSON.stringify('true'),
  'MACRO.VERSION': JSON.stringify(version),
  'MACRO.BUILD_TIME': JSON.stringify(buildTime),
  'MACRO.PACKAGE_URL': JSON.stringify(pkg.name),
  'MACRO.NATIVE_PACKAGE_URL': 'undefined',
  'MACRO.FEEDBACK_CHANNEL': JSON.stringify('github'),
  'MACRO.ISSUES_EXPLAINER': JSON.stringify(
    'OpenClaude — report issues at https://github.com/anthropics/claude-code/issues',
  ),
  'MACRO.VERSION_CHANGELOG': JSON.stringify(
    'https://github.com/anthropics/claude-code',
  ),
}

if (dev) {
  defines['process.env.NODE_ENV'] = JSON.stringify('development')
  defines['process.env.CLAUDE_CODE_EXPERIMENTAL_BUILD'] = JSON.stringify('true')
}

// Build command — using bun build (same approach as free-code)
const cmd: string[] = [
  'bun', 'build',
  './src/entrypoints/cli.tsx',
  ...(compile ? ['--compile', '--bytecode'] : []),
  '--target', 'bun',
  '--format', 'esm',
  '--outfile', outfile,
  '--minify',
  '--packages', 'bundle',
  '--conditions', 'bun',
]

for (const external of externals) {
  cmd.push('--external', external)
}

for (const feature of features) {
  cmd.push(`--feature=${feature}`)
}

for (const [key, value] of Object.entries(defines)) {
  cmd.push('--define', `${key}=${value}`)
}

console.log(`Running: ${cmd.join(' ').substring(0, 200)}...`)

const proc = Bun.spawnSync({
  cmd,
  cwd: import.meta.dir,
  stdout: 'inherit',
  stderr: 'inherit',
})

if (proc.exitCode !== 0) {
  console.error('Build failed with exit code', proc.exitCode)
  process.exit(proc.exitCode ?? 1)
}

if (existsSync(outfile)) {
  chmodSync(outfile, 0o755)
  const stat = await Bun.file(outfile).size
  console.log(`Built ${outfile} (${(stat / 1024 / 1024).toFixed(1)} MB)`)
}

// Install: move binary to ~/.local/bin/openclaude
if (install && compile && existsSync(outfile)) {
  const home = process.env.HOME || process.env.USERPROFILE || ''
  const binDir = `${home}/.local/bin`
  const target = `${binDir}/openclaude`
  mkdirSync(binDir, { recursive: true })
  const { copyFileSync } = await import('fs')
  copyFileSync(outfile, target)
  chmodSync(target, 0o755)
  console.log(`Installed → ${target}`)
}

console.log('Build complete.')
