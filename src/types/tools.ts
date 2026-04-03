/**
 * Stub type definitions for tool progress types.
 * These were stripped during open-sourcing and recreated as minimal stubs.
 */

export interface ShellProgress {
  type: 'shell'
  output: string
  fullOutput: string
  elapsedTimeSeconds: number
  totalLines: number
  [key: string]: any
}

export interface BashProgress {
  type: 'bash_progress'
  output: string
  fullOutput: string
  elapsedTimeSeconds: number
  totalLines: number
  [key: string]: any
}

export interface PowerShellProgress {
  type: 'powershell_progress'
  output: string
  fullOutput: string
  elapsedTimeSeconds: number
  totalLines: number
  [key: string]: any
}

export interface AgentToolProgress {
  type: 'agent' | 'agent_progress'
  [key: string]: any
}

export interface MCPProgress {
  type: 'mcp' | 'mcp_progress'
  [key: string]: any
}

export interface SkillToolProgress {
  type: 'skill' | 'skill_progress'
  [key: string]: any
}

export interface WebSearchProgress {
  type: 'web_search' | 'query_update' | 'search_results_received'
  [key: string]: any
}

export interface SdkWorkflowProgress {
  type: 'workflow'
  [key: string]: any
}

export interface REPLToolProgress {
  type: 'repl'
  [key: string]: any
}

export interface REPLToolCallProgress {
  type: 'repl_tool_call'
  phase: string
  [key: string]: any
}

export interface TaskOutputProgress {
  type: 'task_output' | 'waiting_for_task'
  [key: string]: any
}

export interface HookToolProgress {
  type: 'hook_progress'
  [key: string]: any
}

export type ToolProgressData =
  | ShellProgress
  | BashProgress
  | PowerShellProgress
  | AgentToolProgress
  | MCPProgress
  | SkillToolProgress
  | WebSearchProgress
  | SdkWorkflowProgress
  | REPLToolProgress
  | REPLToolCallProgress
  | TaskOutputProgress
  | HookToolProgress
