# OpenClaude

An open-source AI coding assistant for the terminal, powered by OpenRouter API.

## Disclaimer / Legal Notice

**This project is for educational and learning purposes only. It is NOT for commercial use.**

The repository owner does NOT hold any copyright over the underlying codebase. The original source code is derived from [Claude Code](https://www.npmjs.com/package/@anthropic-ai/claude-code) by Anthropic. All rights to the original code belong to Anthropic, PBC.

By using this project, you agree that:
- You will only use it for personal learning and research
- You will not use it for any commercial purpose
- You assume all responsibility for your use of this software

## Features

- Uses [OpenRouter](https://openrouter.ai/) as the default API provider
- Default model: `z-ai/glm-5-turbo`
- Separate config directory (`~/.openclaude/`) — does not conflict with official Claude Code
- Standalone Bun-compiled binary — no runtime dependencies
- All core tools: Bash, file edit/read/write, glob, grep, web fetch/search, MCP, agents, tasks, and more

## Requirements

- [Bun](https://bun.sh/) >= 1.3.11
- An [OpenRouter](https://openrouter.ai/) API key

## Build & Install

```bash
# Install dependencies
bun install

# Build and install to ~/.local/bin/openclaude
bun run install-bin
```

Make sure `~/.local/bin` is in your `PATH`.

## Usage

```bash
# First run — the onboarding wizard will guide you to enter your OpenRouter API key
openclaude

# One-shot prompt
openclaude -p "your prompt here"
```

First time launch will walk you through:
1. Theme selection
2. Paste your OpenRouter API key (get one at [openrouter.ai/keys](https://openrouter.ai/keys))
3. Security & trust settings
4. Ready to use

## Advanced Configuration

All config is stored in `~/.openclaude/`. Environment variables (all optional, defaults are built-in):

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_BASE_URL` | `https://openrouter.ai/api` | API base URL |
| `ANTHROPIC_MODEL` | `z-ai/glm-5-turbo` | Model to use |
| `ANTHROPIC_API_KEY` | (set via onboarding) | Your OpenRouter API key |
| `CLAUDE_CONFIG_DIR` | `~/.openclaude` | Config directory |

## Build Options

```bash
bun run build          # Build compiled binary (dist/cli)
bun run build:dev      # Dev build with git-based version
bun run install-bin    # Build + install to ~/.local/bin/openclaude
bun run dev            # Run directly from source (no build)
```

---

# OpenClaude (中文)

一个开源的终端 AI 编程助手，基于 OpenRouter API。

## 免责声明 / 法律声明

**本项目仅供学习和研究使用，禁止任何商业用途。**

仓库拥有者不持有底层代码的任何版权。原始源代码来源于 Anthropic 的 [Claude Code](https://www.npmjs.com/package/@anthropic-ai/claude-code)。原始代码的所有权利归 Anthropic, PBC 所有。

使用本项目即表示您同意：
- 仅将其用于个人学习和研究
- 不将其用于任何商业目的
- 您自行承担使用本软件的全部责任

## 功能特性

- 默认使用 [OpenRouter](https://openrouter.ai/) 作为 API 提供方
- 默认模型：`z-ai/glm-5-turbo`
- 独立配置目录（`~/.openclaude/`），不与官方 Claude Code 冲突
- 独立 Bun 编译二进制文件，无运行时依赖
- 完整工具支持：Bash、文件编辑/读取/写入、glob、grep、web 抓取/搜索、MCP、agents、tasks 等

## 环境要求

- [Bun](https://bun.sh/) >= 1.3.11
- 一个 [OpenRouter](https://openrouter.ai/) API key

## 构建与安装

```bash
# 安装依赖
bun install

# 构建并安装到 ~/.local/bin/openclaude
bun run install-bin
```

确保 `~/.local/bin` 在你的 `PATH` 中。

## 使用方法

```bash
# 首次启动 — 引导向导会指引你输入 OpenRouter API key
openclaude

# 单次提问
openclaude -p "你的问题"
```

首次启动会引导你完成：
1. 主题选择
2. 粘贴你的 OpenRouter API key（在 [openrouter.ai/keys](https://openrouter.ai/keys) 获取）
3. 安全与信任设置
4. 开始使用

## License

For educational use only. Not for commercial use. See disclaimer above.
