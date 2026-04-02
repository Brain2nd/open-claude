# CLAUDE.md

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
3. Falls through to `src/main.tsx` for the full interactive CLI

### Build System

`build-bun.ts` drives `bun build --compile` with:
- **Feature flags** via `bun:bundle`'s `feature()` — compile-time dead code elimination. The `enabledFeatures` array in `build-bun.ts` is the source of truth for which features are active.
- **MACRO defines** — `MACRO.VERSION`, `MACRO.BUILD_TIME`, etc. injected at build time; fallback defaults exist in `cli.tsx` for dev mode.
- **Native externals** — NAPI modules (`audio-capture-napi`, `image-processor-napi`, etc.) are excluded from the bundle.
- `--dev` flag enables extra feature flags (DAEMON, BRIDGE_MODE, VOICE_MODE, KAIROS, etc.).

### Core Loop

`src/query.ts` / `src/QueryEngine.ts` — the query engine streams messages to the Claude API (`src/services/api/claude.ts`), executes tool calls in a loop, and returns when `stop_reason !== "tool_use"`.

### Tools (`src/tools/`, 59 tool directories)

Each tool is a directory under `src/tools/` with an `index.ts` export. The tool registry lives in `src/tools.ts` (`getTools()`). Tool permission checks go through the `useCanUseTool` hook.

### Commands (`src/commands/`, 112 command directories)

Slash-commands (e.g., `/commit`, `/compact`, `/buddy`). Each is a directory with `index.ts`. The registry is `src/commands.ts`. Many commands are feature-gated and lazily imported.

### Skills (`src/skills/`)

Skills are bundled prompt templates loaded at runtime. `src/skills/bundled/` contains the built-in skills; `src/skills/bundledSkills.ts` is the registry. MCP-based skills are handled by `mcpSkills.ts` / `mcpSkillBuilders.ts`.

### State Management

React 19 + Ink 6 for terminal UI. `src/state/AppState.tsx` provides a central React context; `src/state/AppStateStore.ts` is the backing store. Key state: messages, tools, tasks, permissions, cost tracking.

### Services (`src/services/`)

Cross-cutting concerns: `api/` (Claude API client), `mcp/` (Model Context Protocol), `oauth/` (auth flows), `compact/` (message compaction/summarization), `analytics/` (GrowthBook), `plugins/`, `tokenEstimation.ts`.

### Shims & Internal Package Replacement

- `shims/` — stub modules replacing internal/Anthropic-only packages (e.g., `ant-computer-use-*`, `ant-claude-for-chrome-mcp`). These enable the build to compile without proprietary dependencies.
- `shims/bun-bundle.ts` — runtime shim for `bun:bundle`'s `feature()` function, used when running via `bun run dev` instead of the compiled binary. Feature flags can be toggled at runtime via `CLAUDE_CODE_FEATURES="FLAG1,FLAG2,..."`.
- `node_modules/@ant/` — packages like `computer-use-mcp`, `computer-use-input` that shim Anthropic internal-only modules.
- `vendor/` — native module source code (`audio-capture-src`, `image-processor-src`, `modifiers-napi-src`, `url-handler-src`).

## Key Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_BASE_URL` | `https://openrouter.ai/api` | API endpoint |
| `ANTHROPIC_MODEL` | `z-ai/glm-5-turbo` | Default model |
| `ANTHROPIC_API_KEY` | *(set via onboarding)* | OpenRouter API key |
| `CLAUDE_CONFIG_DIR` | `~/.openclaude` | Config/state directory |

## Important Patterns

- **Feature gating**: Use `import { feature } from 'bun:bundle'` and wrap code in `if (feature('FLAG_NAME'))` blocks. Dead code is eliminated at compile time. In dev mode (`bun run dev`), the runtime shim in `shims/bun-bundle.ts` handles this — edit its `FEATURE_FLAGS` object or set `CLAUDE_CODE_FEATURES` env var.
- **Path aliases**: `src/*` maps to `src/` (configured in `tsconfig.json`).
- **TypeScript**: strict mode is off; JSX uses `react-jsx` transform; module resolution is `bundler`.
- **Circular dependency breaking**: Lazy `require()` calls are used throughout (e.g., `const getModule = () => require('./module.js')`).
- **Build-time defines**: `MACRO.*` globals are injected at compile time. For `bun run dev`, defaults are set at the top of `cli.tsx`.
