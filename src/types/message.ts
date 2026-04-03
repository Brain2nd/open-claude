/**
 * Stub type definitions for message types.
 * These were stripped during open-sourcing and recreated as minimal stubs.
 */
import type { Attachment } from '../utils/attachments.js'
import type { Progress } from '../Tool.js'

/** UUID string type - uses plain string for compatibility */
export type UUID = string

// Base fields shared by all message types
export interface MessageBase {
  uuid: string
  timestamp: string
  [key: string]: any
}

// Origin of a message
export type MessageOrigin = {
  kind: string
  server?: string
  [key: string]: any
}

// System message severity level
export type SystemMessageLevel = 'info' | 'warning' | 'error' | 'suggestion'

// Direction for partial compaction
export type PartialCompactDirection = 'from' | 'up_to' | 'oldest' | 'newest' | 'both'

// Stop hook info
export interface StopHookInfo {
  hookName?: string
  command?: string
  exitCode?: number
  output?: string
  durationMs?: number
  [key: string]: any
}

// ── Core message types ────────────────────────────────────────────────

export interface AssistantMessage extends MessageBase {
  type: 'assistant'
  message: {
    id: string
    container: any
    model: string
    role: 'assistant'
    stop_reason: string | null
    stop_sequence: string | null
    type: string
    usage: any
    content: any[]
    context_management?: any
    [key: string]: any
  }
  isMeta?: true
  isVirtual?: true
  requestId?: string
  apiError?: any
  error?: any
  errorDetails?: string
  isApiErrorMessage?: boolean
  advisorModel?: string
  costUsd?: number
  [key: string]: any
}

export interface UserMessage extends MessageBase {
  type: 'user'
  message: {
    role: 'user'
    content: string | any[]
    [key: string]: any
  }
  isMeta?: true
  isVisibleInTranscriptOnly?: true
  isVirtual?: true
  isCompactSummary?: true
  summarizeMetadata?: {
    messagesSummarized: number
    userContext?: string
    direction?: PartialCompactDirection
  }
  toolUseResult?: unknown
  mcpMeta?: {
    _meta?: Record<string, unknown>
    structuredContent?: Record<string, unknown>
  }
  imagePasteIds?: number[]
  sourceToolAssistantUUID?: UUID
  permissionMode?: any
  origin?: MessageOrigin
  [key: string]: any
}

export interface SystemMessageBase extends MessageBase {
  type: 'system'
  subtype: string
  isMeta?: boolean
  level?: SystemMessageLevel
  content?: string
  [key: string]: any
}

export interface SystemInformationalMessage extends SystemMessageBase {
  subtype: 'informational'
  content: string
  level: SystemMessageLevel
  toolUseID?: string
  preventContinuation?: boolean
}

export interface SystemAPIErrorMessage extends SystemMessageBase {
  subtype: 'api_error'
  level: 'error'
  error: any
  cause?: Error
  retryInMs: number
  retryAttempt: number
  maxRetries: number
}

export interface SystemCompactBoundaryMessage extends SystemMessageBase {
  subtype: 'compact_boundary'
  content: string
  level: SystemMessageLevel
  compactMetadata: CompactMetadata
  logicalParentUuid?: UUID
}

export interface SystemMicrocompactBoundaryMessage extends SystemMessageBase {
  subtype: 'microcompact_boundary'
  content: string
  level: SystemMessageLevel
  microcompactMetadata: {
    trigger: 'auto'
    preTokens: number
    tokensSaved: number
    compactedToolIds: string[]
    clearedAttachmentUUIDs: string[]
  }
}

export interface SystemPermissionRetryMessage extends SystemMessageBase {
  subtype: 'permission_retry'
  content: string
  commands: string[]
  level: SystemMessageLevel
}

export interface SystemBridgeStatusMessage extends SystemMessageBase {
  subtype: 'bridge_status'
  content: string
  url: string
  upgradeNudge?: string
}

export interface SystemScheduledTaskFireMessage extends SystemMessageBase {
  subtype: 'scheduled_task_fire'
  content: string
}

export interface SystemStopHookSummaryMessage extends SystemMessageBase {
  subtype: 'stop_hook_summary'
  hookCount: number
  hookInfos: StopHookInfo[]
  hookErrors: string[]
  preventedContinuation: boolean
  stopReason: string | undefined
  hasOutput: boolean
  level: SystemMessageLevel
  toolUseID?: string
  hookLabel?: string
  totalDurationMs?: number
}

export interface SystemTurnDurationMessage extends SystemMessageBase {
  subtype: 'turn_duration'
  durationMs: number
  budgetTokens?: number
  budgetLimit?: number
  budgetNudges?: number
  messageCount?: number
}

export interface SystemAwaySummaryMessage extends SystemMessageBase {
  subtype: 'away_summary'
  content: string
}

export interface SystemMemorySavedMessage extends SystemMessageBase {
  subtype: 'memory_saved'
  writtenPaths: string[]
}

export interface SystemAgentsKilledMessage extends SystemMessageBase {
  subtype: 'agents_killed'
}

export interface SystemApiMetricsMessage extends SystemMessageBase {
  subtype: 'api_metrics'
  ttftMs: number
  otps: number
  isP50?: boolean
  hookDurationMs?: number
  turnDurationMs?: number
  toolDurationMs?: number
  classifierDurationMs?: number
  toolCount?: number
  hookCount?: number
  classifierCount?: number
  configWriteCount?: number
}

export interface SystemLocalCommandMessage extends SystemMessageBase {
  subtype: 'local_command'
  content: string
  level: SystemMessageLevel
}

export interface SystemThinkingMessage extends SystemMessageBase {
  subtype: 'thinking'
  [key: string]: any
}

export interface SystemFileSnapshotMessage extends SystemMessageBase {
  subtype: 'file_snapshot'
  content: string
  level: SystemMessageLevel
  snapshotFiles: Array<{
    key: string
    path: string
    content: string
  }>
}

export type SystemMessage =
  | SystemInformationalMessage
  | SystemAPIErrorMessage
  | SystemCompactBoundaryMessage
  | SystemMicrocompactBoundaryMessage
  | SystemPermissionRetryMessage
  | SystemBridgeStatusMessage
  | SystemScheduledTaskFireMessage
  | SystemStopHookSummaryMessage
  | SystemTurnDurationMessage
  | SystemAwaySummaryMessage
  | SystemMemorySavedMessage
  | SystemAgentsKilledMessage
  | SystemApiMetricsMessage
  | SystemLocalCommandMessage
  | SystemThinkingMessage
  | SystemFileSnapshotMessage
  | SystemMessageBase

// ── Attachment message ────────────────────────────────────────────────

export interface AttachmentMessage<A = Attachment> extends MessageBase {
  type: 'attachment'
  attachment: A
  [key: string]: any
}

// ── Progress message ──────────────────────────────────────────────────

export interface ProgressMessage<P = Progress> extends MessageBase {
  type: 'progress'
  data: P
  toolUseID: string
  parentToolUseID: string
  [key: string]: any
}

// ── Tombstone message (marks removed messages) ────────────────────────

export interface TombstoneMessage {
  type: 'tombstone'
  message?: any
  [key: string]: any
}

// ── Tool use summary (SDK emission) ──────────────────────────────────

export interface ToolUseSummaryMessage extends MessageBase {
  type: 'tool_use_summary'
  summary: string
  precedingToolUseIds: string[]
}

// ── Stream event (real-time streaming) ────────────────────────────────

export interface StreamEvent {
  type: 'stream_event'
  event?: any
  ttftMs?: number
  [key: string]: any
}

// ── Request start event ───────────────────────────────────────────────

export interface RequestStartEvent {
  type: 'request_start'
  [key: string]: any
}

// ── Stream request start event ───────────────────────────────────────

export interface StreamRequestStartEvent {
  type: 'stream_request_start'
  [key: string]: any
}

// ── Union of all message types ────────────────────────────────────────

export type Message =
  | AssistantMessage
  | UserMessage
  | SystemMessage
  | AttachmentMessage
  | ProgressMessage
  | TombstoneMessage
  | ToolUseSummaryMessage
  | StreamEvent
  | RequestStartEvent
  | StreamRequestStartEvent

// ── Hook result message ───────────────────────────────────────────────

export type HookResultMessage = AttachmentMessage | ProgressMessage

// ── Normalized messages (one content block per message) ───────────────

export interface NormalizedAssistantMessage<T = any> extends AssistantMessage {
  message: AssistantMessage['message'] & {
    content: [T]
    context_management: any
  }
}

export interface NormalizedUserMessage extends UserMessage {
  message: {
    role: 'user'
    content: [any]
    [key: string]: any
  }
  [key: string]: any
}

export type NormalizedMessage =
  | NormalizedAssistantMessage
  | NormalizedUserMessage
  | SystemMessage
  | AttachmentMessage
  | ProgressMessage

// ── Renderable message (what the UI can display) ──────────────────────

export type RenderableMessage =
  | NormalizedAssistantMessage
  | NormalizedUserMessage
  | SystemMessage
  | AttachmentMessage
  | ProgressMessage
  | GroupedToolUseMessage
  | CollapsedReadSearchGroup

// ── Grouped tool use ──────────────────────────────────────────────────

export interface GroupedToolUseMessage extends MessageBase {
  type: 'grouped_tool_use'
  messages: NormalizedAssistantMessage[]
  toolName?: string
  results?: NormalizedUserMessage[]
  displayMessage?: any
  messageId?: string
  [key: string]: any
}

// ── Collapsed read/search group ───────────────────────────────────────

export interface CollapsedReadSearchGroup extends MessageBase {
  type: 'collapsed_read_search'
  messages: NormalizedAssistantMessage[]
  [key: string]: any
}

// ── Collapsible message (used by collapse logic) ──────────────────────

export type CollapsibleMessage =
  | NormalizedAssistantMessage
  | GroupedToolUseMessage

// ── Compact metadata ──────────────────────────────────────────────────

export interface CompactMetadata {
  trigger: 'manual' | 'auto'
  preTokens: number
  userContext?: string
  messagesSummarized?: number
  preservedSegment?: {
    headUuid: string
    anchorUuid: string
    tailUuid: string
  }
  [key: string]: any
}
