/**
 * Runtime shim for `bun:bundle` feature() function.
 *
 * The original Bun build uses compile-time `feature()` calls for dead-code
 * elimination. This shim provides a runtime equivalent that reads from a
 * configuration object, enabling secondary development with esbuild/tsx/etc.
 *
 * Feature flags can be controlled via:
 * 1. The FEATURE_FLAGS object below (edit directly for your build)
 * 2. Environment variable: CLAUDE_CODE_FEATURES="FLAG1,FLAG2,..." to enable specific flags
 */

// ---------------------------------------------------------------------------
// Default feature flags — edit this to enable/disable features in your build.
// Set to `true` to enable, `false` to disable.
// ---------------------------------------------------------------------------
const FEATURE_FLAGS: Record<string, boolean> = {
  // --- Core features (safe to enable) ---
  AUTO_THEME: true,
  BASH_CLASSIFIER: true,
  BUILDING_CLAUDE_APPS: true,
  BUILTIN_EXPLORE_PLAN_AGENTS: true,
  COMMIT_ATTRIBUTION: true,
  COMPACTION_REMINDERS: true,
  CONNECTOR_TEXT: true,
  CONTEXT_COLLAPSE: true,
  DOWNLOAD_USER_SETTINGS: true,
  EXTRACT_MEMORIES: true,
  FORK_SUBAGENT: true,
  HISTORY_PICKER: true,
  HISTORY_SNIP: true,
  HOOK_PROMPTS: true,
  MCP_RICH_OUTPUT: true,
  MCP_SKILLS: true,
  MESSAGE_ACTIONS: true,
  REACTIVE_COMPACT: true,
  SKIP_DETECTION_WHEN_AUTOUPDATES_DISABLED: true,
  STREAMLINED_OUTPUT: true,
  TEAMMEM: true,
  TOKEN_BUDGET: true,
  ULTRAPLAN: true,
  ULTRATHINK: true,
  UPLOAD_USER_SETTINGS: true,

  // --- Platform detection ---
  IS_LIBC_GLIBC: process.platform === 'linux',
  IS_LIBC_MUSL: false,

  // --- Experimental / internal features (disabled by default) ---
  ABLATION_BASELINE: false,
  AGENT_MEMORY_SNAPSHOT: false,
  AGENT_TRIGGERS: false,
  AGENT_TRIGGERS_REMOTE: false,
  ALLOW_TEST_VERSIONS: false,
  ANTI_DISTILLATION_CC: false,
  AWAY_SUMMARY: false,
  BG_SESSIONS: false,
  BREAK_CACHE_COMMAND: false,
  BRIDGE_MODE: false,
  BUDDY: false,
  BYOC_ENVIRONMENT_RUNNER: false,
  CACHED_MICROCOMPACT: false,
  CCR_AUTO_CONNECT: false,
  CCR_MIRROR: false,
  CCR_REMOTE_SETUP: false,
  CHICAGO_MCP: false,
  COORDINATOR_MODE: false,
  COWORKER_TYPE_TELEMETRY: false,
  DAEMON: false,
  DIRECT_CONNECT: false,
  DUMP_SYSTEM_PROMPT: false,
  ENHANCED_TELEMETRY_BETA: false,
  EXPERIMENTAL_SKILL_SEARCH: false,
  FILE_PERSISTENCE: false,
  HARD_FAIL: false,
  KAIROS: false,
  KAIROS_BRIEF: false,
  KAIROS_CHANNELS: false,
  KAIROS_DREAM: false,
  KAIROS_GITHUB_WEBHOOKS: false,
  KAIROS_PUSH_NOTIFICATION: false,
  LODESTONE: false,
  MEMORY_SHAPE_TELEMETRY: false,
  MONITOR_TOOL: false,
  NATIVE_CLIENT_ATTESTATION: false,
  NATIVE_CLIPBOARD_IMAGE: false,
  NEW_INIT: false,
  OVERFLOW_TEST_TOOL: false,
  PERFETTO_TRACING: false,
  POWERSHELL_AUTO_MODE: false,
  PROACTIVE: false,
  PROMPT_CACHE_BREAK_DETECTION: false,
  QUICK_SEARCH: false,
  REVIEW_ARTIFACT: false,
  RUN_SKILL_GENERATOR: false,
  SELF_HOSTED_RUNNER: false,
  SHOT_STATS: false,
  SKILL_IMPROVEMENT: false,
  SLOW_OPERATION_LOGGING: false,
  SSH_REMOTE: false,
  TEMPLATES: false,
  TERMINAL_PANEL: false,
  TORCH: false,
  TRANSCRIPT_CLASSIFIER: false,
  TREE_SITTER_BASH: false,
  TREE_SITTER_BASH_SHADOW: false,
  UDS_INBOX: false,
  UNATTENDED_RETRY: false,
  VERIFICATION_AGENT: false,
  VOICE_MODE: false,
  WEB_BROWSER_TOOL: false,
  WORKFLOW_SCRIPTS: false,
}

// Override from environment: CLAUDE_CODE_FEATURES="FLAG1,FLAG2,..."
const envFeatures = process.env.CLAUDE_CODE_FEATURES
if (envFeatures) {
  for (const flag of envFeatures.split(',')) {
    const trimmed = flag.trim()
    if (trimmed) {
      FEATURE_FLAGS[trimmed] = true
    }
  }
}

export function feature(name: string): boolean {
  return FEATURE_FLAGS[name] ?? false
}
