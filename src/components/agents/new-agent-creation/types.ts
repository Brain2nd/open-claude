/**
 * Stub type definitions for agent creation wizard types.
 */

export interface AgentWizardData {
  type?: string
  name?: string
  description?: string
  prompt?: string
  model?: string
  color?: string
  location?: string
  method?: string
  tools?: string[]
  memory?: boolean
  [key: string]: any
}
