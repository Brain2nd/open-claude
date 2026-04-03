import type { TaskStateBase } from '../../Task.js'

export type MonitorMcpTaskState = TaskStateBase & {
  type: 'monitor_mcp'
  [key: string]: any
}

export function MonitorMcpTask() { return null }
export function killMonitorMcp(..._args: any[]): void {}
export function killMonitorMcpTasksForAgent(..._args: any[]): void {}
