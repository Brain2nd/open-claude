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
- **SSH Transparent Proxy** — operate on remote servers without installing anything remotely
- **Prompt Caching** — OpenRouter cache_control passthrough, saves 75-90% on repeated tokens
- `/buddy` companion system — hatch and manage your coding companion
- All core tools: Bash, file edit/read/write, glob, grep, web fetch/search, MCP, agents, tasks, and more

## SSH Transparent Proxy

OpenClaude can operate on remote servers over SSH, with **zero installation on the remote host**. The AI runs locally, but all file operations, shell commands, git, and searches execute transparently on the remote server.

### How It Works

```
Local machine                    Remote server
┌──────────────────┐             ┌──────────────────┐
│  OpenClaude      │  SSH        │  No installation │
│  (AI + UI)       │────────────▶│  needed          │
│                  │ ControlMaster│                  │
│  File Read  ─────┼──ssh cat───▶│  /remote/file    │
│  File Write ─────┼──ssh tee───▶│  /remote/file    │
│  Bash cmd   ─────┼──ssh bash──▶│  runs here       │
│  Git ops    ─────┼──ssh git───▶│  runs here       │
│  Grep/Glob  ─────┼──ssh rg────▶│  runs here       │
└──────────────────┘             └──────────────────┘
```

- **SSH ControlMaster** multiplexes all operations over a single persistent connection (~5ms per operation instead of full SSH handshake each time)
- **Password & key auth** — type your password once on first connect, ControlMaster reuses it for the entire session
- **Interactive directory browser** — navigate and select the remote working directory before starting
- **Full isolation** — remote shell environment, git info, uname, shell detection all query the remote; local config stays local
- **Session resume** — SSH sessions appear in `openclaude --resume`

### Usage

```bash
# Connect with SSH key (auto-detected)
openclaude ssh user@host

# Specify port and identity file
openclaude ssh user@host --port 2222 --identity ~/.ssh/id_ed25519

# Connect and go directly to a specific directory
openclaude ssh user@host /path/to/project --port 22
```

### Advantages Over Traditional Remote Development

| | OpenClaude SSH Proxy | VS Code Remote SSH | SSH + run remotely |
|---|---|---|---|
| Remote installation | **None** | VS Code Server (~200MB) | Full tool install |
| Works on tiny devices | **Yes** (RPi, containers, IoT) | No (needs Node.js) | Depends |
| API key on remote | **Not needed** | N/A | Required |
| Network requirements | SSH only | SSH + reverse tunnel | SSH + outbound HTTPS |
| Setup time | **Instant** | Minutes | Minutes to hours |

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

# Resume a previous session
openclaude --resume
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
bun run typecheck      # TypeScript type checking (tsc --noEmit)
```

---

## Changelog

### v0.0.2

**SSH Transparent Proxy**
- `openclaude ssh user@host` — operate on remote servers with zero remote installation
- SSH ControlMaster connection multiplexing for low-latency operations
- Interactive remote directory browser with keyboard navigation
- Password and key-based authentication (type password once per session)
- Full local/remote isolation: shell env, git, uname, file watchers all query remote
- Remote polling for git refs, settings, skills, team memory (replaces local fs.watch)
- Terminal panel opens SSH interactive shell to remote
- Sessions visible in `openclaude --resume`

**Type System**
- Fixed all 2223 TypeScript errors (was broken since open-sourcing)
- Created 38 stub type definition files for stripped internal types
- `bun run typecheck` now passes with zero errors

**Prompt Caching**
- Enabled OpenRouter `cache_control` passthrough (was incorrectly disabled)
- Multi-turn conversations save 75-90% on repeated input token costs

**Branding & Decoupling**
- System prompts, agent identities, paths fully decoupled from Claude Code
- `/init` creates `OPENCLAUDE.md` (not `CLAUDE.md`)
- `/buddy` companion system enabled and functional
- Temp directory `openclaude-{uid}` isolated from original Claude Code

### v0.0.1

- Initial release
- OpenRouter API integration
- Onboarding flow for API key setup
- All core tools functional
- `/buddy` companion feature

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
- **SSH 透明代理** — 远程服务器零安装，本地运行 AI，远程执行所有操作
- **Prompt 缓存** — OpenRouter cache_control 透传，多轮对话节省 75-90% token 费用
- `/buddy` 宠物伙伴系统
- 完整工具支持：Bash、文件编辑/读取/写入、glob、grep、web 抓取/搜索、MCP、agents、tasks 等

## SSH 透明代理

OpenClaude 可以通过 SSH 操作远程服务器，**远程主机无需安装任何东西**。AI 在本地运行，但所有文件操作、Shell 命令、Git、搜索都透明地在远程服务器上执行。

### 工作原理

```
本地机器                          远程服务器
┌──────────────────┐             ┌──────────────────┐
│  OpenClaude      │  SSH        │  无需安装任何东西  │
│  (AI + UI)       │────────────▶│                  │
│                  │ ControlMaster│                  │
│  文件读取  ──────┼──ssh cat───▶│  /remote/file    │
│  文件写入  ──────┼──ssh tee───▶│  /remote/file    │
│  Bash 命令 ──────┼──ssh bash──▶│  在这里执行       │
│  Git 操作  ──────┼──ssh git───▶│  在这里执行       │
│  搜索      ──────┼──ssh rg────▶│  在这里执行       │
└──────────────────┘             └──────────────────┘
```

- **SSH ControlMaster** 将所有操作复用到一条持久连接上（每次操作 ~5ms，无需重新握手）
- **密码和密钥认证** — 首次连接输入一次密码，整个会话期间自动复用
- **交互式目录浏览器** — 连接后可导航选择远程工作目录
- **完全隔离** — 远程 shell 环境、git 信息、系统信息、文件监听全部查询远程；本地配置保持本地
- **会话恢复** — SSH 会话可在 `openclaude --resume` 中找到

### 使用方法

```bash
# SSH 密钥连接（自动检测）
openclaude ssh user@host

# 指定端口和密钥文件
openclaude ssh user@host --port 2222 --identity ~/.ssh/id_ed25519

# 直接进入指定目录
openclaude ssh user@host /path/to/project --port 22
```

### 相比传统远程开发的优势

| | OpenClaude SSH 代理 | VS Code Remote SSH | SSH + 远程运行 |
|---|---|---|---|
| 远程安装 | **无需** | VS Code Server (~200MB) | 需要完整安装 |
| 小型设备支持 | **支持**（树莓派、容器、IoT）| 不支持（需要 Node.js）| 视情况 |
| 远程需要 API Key | **不需要** | 不适用 | 需要 |
| 网络需求 | 仅 SSH | SSH + 反向隧道 | SSH + 出站 HTTPS |
| 配置时间 | **即时** | 几分钟 | 几分钟到几小时 |

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

# 恢复之前的会话
openclaude --resume
```

首次启动会引导你完成：
1. 主题选择
2. 粘贴你的 OpenRouter API key（在 [openrouter.ai/keys](https://openrouter.ai/keys) 获取）
3. 安全与信任设置
4. 开始使用

## 更新日志

### v0.0.2

**SSH 透明代理**
- `openclaude ssh user@host` — 远程服务器零安装操作
- SSH ControlMaster 连接复用，低延迟操作
- 交互式远程目录浏览器
- 密码和密钥认证（每会话输入一次密码）
- 完全本地/远程隔离：shell 环境、git、uname、文件监听全部查询远程
- 远程轮询 git refs、设置、技能、团队记忆（替代本地 fs.watch）
- 终端面板打开到远程的 SSH 交互 shell
- 会话可在 `openclaude --resume` 中找到

**类型系统**
- 修复全部 2223 个 TypeScript 错误（开源以来一直存在的问题）
- 创建 38 个缺失的类型定义 stub 文件
- `bun run typecheck` 现在零错误通过

**Prompt 缓存**
- 启用 OpenRouter `cache_control` 透传（之前被错误禁用）
- 多轮对话节省 75-90% 的重复 input token 费用

**品牌与解耦**
- 系统提示、agent 身份、路径全面与 Claude Code 解耦
- `/init` 创建 `OPENCLAUDE.md`（不再是 `CLAUDE.md`）
- `/buddy` 宠物伙伴系统启用
- 临时目录 `openclaude-{uid}` 与原版 Claude Code 隔离

### v0.0.1

- 首次发布
- OpenRouter API 集成
- API key 引导流程
- 所有核心工具可用
- `/buddy` 宠物伙伴功能

## License

For educational use only. Not for commercial use. See disclaimer above.
