/**
 * Stub type definitions for install-github-app command types.
 */

export type Workflow = 'claude' | 'claude-review' | string

export interface Warning {
  message: string
  [key: string]: any
}

export interface State {
  step: string
  selectedRepoName: string
  currentRepo: string
  useCurrentRepo: boolean
  apiKeyOrOAuthToken: string
  useExistingKey: boolean
  currentWorkflowInstallStep: number
  warnings: Warning[]
  secretExists: boolean
  secretName: string
  useExistingSecret: boolean
  workflowExists: boolean
  selectedWorkflows: Workflow[]
  selectedApiKeyOption: 'existing' | 'new' | 'oauth'
  authType: string
  [key: string]: any
}
