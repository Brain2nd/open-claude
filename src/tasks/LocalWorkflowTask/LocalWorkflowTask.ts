import type { TaskStateBase } from '../../Task.js'

export type LocalWorkflowTaskState = TaskStateBase & {
  type: 'local_workflow'
  [key: string]: any
}

export function LocalWorkflowTask() { return null }
export function killWorkflowTask(..._args: any[]): void {}
export function skipWorkflowAgent(..._args: any[]): void {}
export function retryWorkflowAgent(..._args: any[]): void {}
