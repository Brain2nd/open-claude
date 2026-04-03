#!/bin/bash
# Creates @ant/* shim packages in node_modules that re-export from shims/ directory.
# These replace Anthropic-internal packages that aren't available publicly.
# Run automatically via postinstall hook.

set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
NM="$DIR/node_modules/@ant"

# --- @ant/claude-for-chrome-mcp ---
mkdir -p "$NM/claude-for-chrome-mcp"
cat > "$NM/claude-for-chrome-mcp/package.json" << 'EOF'
{"name":"@ant/claude-for-chrome-mcp","version":"0.0.1","main":"./index.ts"}
EOF
cat > "$NM/claude-for-chrome-mcp/index.ts" << 'EOF'
export { BROWSER_TOOLS, getSocketPaths, createClaudeForChromeMcpServer } from '../../../shims/ant-claude-for-chrome-mcp.js'
export type { ClaudeForChromeContext, Logger, PermissionMode } from '../../../shims/ant-claude-for-chrome-mcp.js'
EOF

# --- @ant/computer-use-mcp ---
mkdir -p "$NM/computer-use-mcp" "$NM/computer-use-mcp/types" "$NM/computer-use-mcp/sentinelApps"
cat > "$NM/computer-use-mcp/package.json" << 'EOF'
{"name":"@ant/computer-use-mcp","version":"0.0.1","main":"./index.ts","exports":{".":"./index.ts","./types":"./types/index.ts","./sentinelApps":"./sentinelApps/index.ts"}}
EOF
cat > "$NM/computer-use-mcp/index.ts" << 'EOF'
export {
  createComputerUseMcpServer, buildComputerUseTools, bindSessionContext,
  API_RESIZE_PARAMS, targetImageSize, DEFAULT_GRANT_FLAGS, getSentinelCategory,
} from '../../../shims/ant-computer-use-mcp.js'
export type {
  ComputerUseSessionContext, CuCallToolResult, CuPermissionRequest, CuPermissionResponse,
  ComputerUseAPI, GrantFlags, SentinelApp, ScreenshotDims, ComputerExecutor, DisplayGeometry,
  FrontmostApp, InstalledApp, ResolvePrepareCaptureResult, RunningApp, ScreenshotResult,
  CoordinateMode, CuSubGates, ComputerUseHostAdapter, Logger,
} from '../../../shims/ant-computer-use-mcp.js'
EOF
cat > "$NM/computer-use-mcp/types/index.ts" << 'EOF'
export { DEFAULT_GRANT_FLAGS } from '../../../../shims/ant-computer-use-mcp.js'
export type {
  ComputerUseSessionContext, CuCallToolResult, CuPermissionRequest, CuPermissionResponse,
  ComputerUseAPI, GrantFlags, SentinelApp, ScreenshotDims, CoordinateMode, CuSubGates,
  ComputerUseHostAdapter, Logger,
} from '../../../../shims/ant-computer-use-mcp.js'
EOF
cat > "$NM/computer-use-mcp/sentinelApps/index.ts" << 'EOF'
export { getSentinelCategory } from '../../../../shims/ant-computer-use-mcp.js'
export type { SentinelApp } from '../../../../shims/ant-computer-use-mcp.js'
EOF

# --- @ant/computer-use-input ---
mkdir -p "$NM/computer-use-input"
cat > "$NM/computer-use-input/package.json" << 'EOF'
{"name":"@ant/computer-use-input","version":"0.0.1","main":"./index.ts"}
EOF
cat > "$NM/computer-use-input/index.ts" << 'EOF'
export { key, keys } from '../../../shims/ant-computer-use-input.js'
export type { ComputerUseInput, ComputerUseInputAPI } from '../../../shims/ant-computer-use-input.js'
EOF

# --- @ant/computer-use-swift ---
mkdir -p "$NM/computer-use-swift"
cat > "$NM/computer-use-swift/package.json" << 'EOF'
{"name":"@ant/computer-use-swift","version":"0.0.1","main":"./index.ts"}
EOF
cat > "$NM/computer-use-swift/index.ts" << 'EOF'
export const ComputerUseAPI: any = {}
EOF

echo "@ant/* shim packages created successfully."
