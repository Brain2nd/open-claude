# OPENCLAUDE.md

This file provides guidance to OpenClaude when working with code in this repository.

## Project Overview

OpenClaude is an open-source terminal AI coding assistant derived from Claude Code, rewired to use **OpenRouter** as the default API provider. Config lives in `~/.openclaude/` (not `~/.claude/`). Educational/non-commercial use only.

## Build & Run Commands

```bash
bun install                # Install dependencies (Bun >= 1.3.11 required)
bun run dev                # Run directly from TypeScript source (fastest iteration)
bun run build              # Production build → ./dist/cli
bun run build:dev          # Dev build with extra features → ./dist/cli-dev
bun run compile            # Standalone binary with bytecode
bun run install-bin        # Build + install to ~/.local/bin/openclaude
bun run typecheck          # TypeScript type checking (tsc --noEmit)
```

There is no test suite in this repository. Validate changes with `bun run typecheck` and manual testing via `bun run dev`.

## Architecture

### Entry Point & Bootstrap

`src/entrypoints/cli.tsx` is the single entry point. It:
1. Sets OpenRouter defaults (`ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`, `CLAUDE_CONFIG_DIR`) before anything else loads
2. Checks fast-path flags (`--version`, `--dump-system-prompt`, etc.) with zero module loading
3. Falls through to `src/main.tsx` for the full interactive CLI — which initializes telemetry, config, auth, sets up React context (`AppState`) and the Ink renderer, then either renders the interactive REPL or executes a one-shot query.

### Build System

`build-bun.ts` drives `bun build --compile` with:
- **Feature flags** via `bun:bundle`'s `feature()` — compile-time dead code elimination. The `enabledFeatures` array in `build-bun.ts` is the source of truth for which features are active.
- **MACRO defines** — `MACRO.VERSION`, `MACRO.BUILD_TIME`, etc. injected at build time; fallback defaults exist in `cli.tsx` for dev mode.
- **Native externals** — NAPI modules (`audio-capture-napi`, `image-processor-napi`, etc.) are excluded from the bundle.
- `--dev` flag enables extra feature flags (DAEMON, BRIDGE_MODE, VOICE_MODE, KAIROS, etc.).

### Core Loop

`src/query.ts` / `src/QueryEngine.ts` — the query engine streams messages to the Claude API (`src/services/api/claude.ts`), executes tool calls in a loop until `stop_reason !== "tool_use"`, and manages state, permissions, and cost tracking throughout.

**Query engine submodules:**
- `src/query/config.ts` — tool assembly, system prompt sections, token budget, compaction strategy
- `src/query/transitions.ts` — terminal/continue state transitions
- `src/query/deps.ts` — dependency injection (swap implementations for testing)

**Data flow:** User Input → Command Resolution (`src/commands.ts`) → Permission Check → Hook: `pre_tool_use` → Tool Execution (`src/tools/`) → Hook: `post_tool_use` → API Request (`src/services/api/claude.ts`) → Tool Execution Loop → Session Storage → REPL Display Update

### Tools (`src/tools/`, 59 tool directories)

Each tool is a directory under `src/tools/` with an `index.ts` export. The tool registry lives in `src/tools.ts` (`getTools()`). Tool permission checks go through the `useCanUseTool` hook.

Key tool categories:
- **File**: `BashTool`, `FileEditTool`, `FileReadTool`, `FileWriteTool`, `NotebookEditTool`
- **Search**: `GlobTool`, `GrepTool`, `WebSearchTool`, `WebFetchTool`
- **System**: `AgentTool`, `SkillTool`, `TaskCreateTool`, `TaskUpdateTool`, `ConfigTool`
- **UI**: `AskUserQuestionTool`, `EnterPlanModeTool`, `ExitWorktreeTool`

### Commands (`src/commands/`, 112 command directories)

Slash-commands (e.g., `/commit`, `/compact`, `/buddy`). Each is a directory with `index.ts`. The registry is `src/commands.ts`. Many commands are feature-gated and lazily imported via `require()`.

**Command types:** `prompt` (expand to text sent to model), `local` (execute locally, return text), `local-jsx` (render interactive Ink UI).

**Command sources** (priority order): bundled skills → plugin skills → user skills (`~/.openclaude/skills/`) → workflow commands → plugin commands → built-in commands (`src/commands/`).

### Skills (`src/skills/`)

Two types:
1. **Bundled skills** (`src/skills/bundled/`) — prompt templates shipped with the binary, registered in `src/skills/bundledSkills.ts` via `registerBundledSkill()`. Can include inline files extracted to disk on first use.
2. **MCP-based skills** — loaded dynamically from MCP servers, handled by `mcpSkills.ts` / `mcpSkillBuilder.ts`.

### Hook System (`src/utils/hooks.ts`)

User-defined scripts executed at lifecycle points (configured in `~/.openclaude/settings.json` under `hooks`):
- **Tool lifecycle:** `pre_tool_use`, `post_tool_use`, `post_tool_use_failure`
- **Session:** `session_start`, `session_end`, `setup`
- **Compaction:** `pre_compact`, `post_compact`
- **Tasks:** `task_created`, `task_completed`
- **Agents:** `subagent_start`, `subagent_stop`, `teammate_idle`
- **Other:** `config_change`, `cwd_changed`, `file_changed`, `permission_denied`, `stop`

### State Management

React 19 + Ink 6 for terminal UI. `src/state/AppState.tsx` provides a central React context; `src/state/AppStateStore.ts` is the backing store. Key state: messages, tools, tasks, permissions, cost tracking, user settings.

### Services (`src/services/`)

- `api/` — Claude API client (`claude.ts`), streaming, retry logic. Multi-provider support: Anthropic, OpenRouter (default), AWS Bedrock, Google Vertex AI, Anthropic Foundry.
- `mcp/` — Model Context Protocol client, config, auth, connection management (23 files). Supports transports: stdio, sse, streamableHttp, websocket, in-process, sdkControl.
- `compact/` — message compaction and summarization (reactiveCompact, cachedMicrocompact)
- `oauth/` — authentication flows
- `analytics/` — GrowthBook feature flags and tracking
- `plugins/` — plugin loading and management
- `SessionMemory/` — session persistence, `SessionTranscript/` — transcript recording

### UI Layer

React + Ink 6 with custom renderer modifications in `src/ink/`. Component library in `src/components/` (design-system, messages, permissions, settings, tasks, agents, skills). Screens in `src/screens/` (REPL, Doctor, ResumeConversation). Theme system with design tokens.

### Config Files

- `~/.openclaude/settings.json` — user settings (model, permissions, keybindings, hooks, MCP servers)
- `~/.openclaude/claude_mcp.json` — MCP server configurations
- `~/.openclaude/sessions/{sessionId}.json` — session transcripts (NDJSON format)

### Shims & Internal Package Replacement

- `shims/` — stub modules replacing internal/Anthropic-only packages (e.g., `ant-computer-use-*`, `ant-claude-for-chrome-mcp`).
- `shims/bun-bundle.ts` — runtime shim for `bun:bundle`'s `feature()` function. In dev mode, feature flags can be toggled by editing its `FEATURE_FLAGS` object or setting `CLAUDE_CODE_FEATURES` env var.
- `node_modules/@ant/` — packages that shim Anthropic internal-only modules.
- `vendor/` — native module source code (`audio-capture-src`, `image-processor-src`, `modifiers-napi-src`, `url-handler-src`).

## Extending the Codebase

### Adding a New Tool

1. Create `src/tools/MyTool/index.ts` implementing the `Tool` interface
2. Register in `src/tools.ts` in the `getTools()` function
3. Permission checks are handled by the existing `useCanUseTool` hook

### Adding a New Command

1. Create `src/commands/my-command/index.ts`
2. Register in `src/commands.ts`
3. If feature-gated, use lazy import: `const cmd = feature('MY_FLAG') ? require('./commands/my-command/index.js').default : null`

### Adding a Bundled Skill

1. Create `src/skills/bundled/my-skill.ts` exporting a `getPrompt` function
2. Register in `src/skills/bundledSkills.ts` via `registerBundledSkill()`

## Key Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_BASE_URL` | `https://openrouter.ai/api` | API endpoint |
| `ANTHROPIC_MODEL` | `z-ai/glm-5-turbo` | Default model |
| `ANTHROPIC_API_KEY` | *(set via onboarding)* | OpenRouter API key |
| `CLAUDE_CONFIG_DIR` | `~/.openclaude` | Config/state directory |
| `CLAUDE_CODE_FEATURES` | *(none)* | Comma-separated feature flags (dev mode only) |

## Important Patterns

- **Feature gating**: Use `import { feature } from 'bun:bundle'` and wrap code in `if (feature('FLAG_NAME'))` blocks. Dead code is eliminated at compile time. In dev mode, the runtime shim in `shims/bun-bundle.ts` handles this — edit its `FEATURE_FLAGS` object or set `CLAUDE_CODE_FEATURES` env var.
- **Path aliases**: `src/*` maps to `src/` (configured in `tsconfig.json`).
- **TypeScript**: strict mode is off; JSX uses `react-jsx` transform; module resolution is `bundler`.
- **Circular dependency breaking**: Lazy `require()` calls are used throughout (e.g., `const getModule = () => require('./module.js')`).
- **Build-time defines**: `MACRO.*` globals are injected at compile time. For `bun run dev`, defaults are set at the top of `cli.tsx`.
