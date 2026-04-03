/**
 * Stub types for message queue operations.
 */

export type QueueOperation = string

export interface QueueOperationMessage {
  type: 'queue-operation'
  operation: QueueOperation
  timestamp: string
  sessionId: string
  content?: string
  [key: string]: any
}
