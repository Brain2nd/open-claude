/**
 * Auto-generated SDK control types from controlSchemas.ts
 */

import { z } from 'zod/v4'
import * as schemas from './controlSchemas.js'

export type JSONRPCMessage = z.infer<ReturnType<typeof schemas.JSONRPCMessagePlaceholder>>
export type SDKHookCallbackMatcher = z.infer<ReturnType<typeof schemas.SDKHookCallbackMatcherSchema>>
export type SDKControlInitializeRequest = z.infer<ReturnType<typeof schemas.SDKControlInitializeRequestSchema>>
export type SDKControlInitializeResponse = z.infer<ReturnType<typeof schemas.SDKControlInitializeResponseSchema>>
export type SDKControlInterruptRequest = z.infer<ReturnType<typeof schemas.SDKControlInterruptRequestSchema>>
export type SDKControlPermissionRequest = z.infer<ReturnType<typeof schemas.SDKControlPermissionRequestSchema>>
export type SDKControlSetPermissionModeRequest = z.infer<ReturnType<typeof schemas.SDKControlSetPermissionModeRequestSchema>>
export type SDKControlSetModelRequest = z.infer<ReturnType<typeof schemas.SDKControlSetModelRequestSchema>>
export type SDKControlSetMaxThinkingTokensRequest = z.infer<ReturnType<typeof schemas.SDKControlSetMaxThinkingTokensRequestSchema>>
export type SDKControlMcpStatusRequest = z.infer<ReturnType<typeof schemas.SDKControlMcpStatusRequestSchema>>
export type SDKControlMcpStatusResponse = z.infer<ReturnType<typeof schemas.SDKControlMcpStatusResponseSchema>>
export type SDKControlGetContextUsageRequest = z.infer<ReturnType<typeof schemas.SDKControlGetContextUsageRequestSchema>>
export type SDKControlGetContextUsageResponse = z.infer<ReturnType<typeof schemas.SDKControlGetContextUsageResponseSchema>>
export type SDKControlRewindFilesRequest = z.infer<ReturnType<typeof schemas.SDKControlRewindFilesRequestSchema>>
export type SDKControlRewindFilesResponse = z.infer<ReturnType<typeof schemas.SDKControlRewindFilesResponseSchema>>
export type SDKControlCancelAsyncMessageRequest = z.infer<ReturnType<typeof schemas.SDKControlCancelAsyncMessageRequestSchema>>
export type SDKControlCancelAsyncMessageResponse = z.infer<ReturnType<typeof schemas.SDKControlCancelAsyncMessageResponseSchema>>
export type SDKControlSeedReadStateRequest = z.infer<ReturnType<typeof schemas.SDKControlSeedReadStateRequestSchema>>
export type SDKHookCallbackRequest = z.infer<ReturnType<typeof schemas.SDKHookCallbackRequestSchema>>
export type SDKControlMcpMessageRequest = z.infer<ReturnType<typeof schemas.SDKControlMcpMessageRequestSchema>>
export type SDKControlMcpSetServersRequest = z.infer<ReturnType<typeof schemas.SDKControlMcpSetServersRequestSchema>>
export type SDKControlMcpSetServersResponse = z.infer<ReturnType<typeof schemas.SDKControlMcpSetServersResponseSchema>>
export type SDKControlReloadPluginsRequest = z.infer<ReturnType<typeof schemas.SDKControlReloadPluginsRequestSchema>>
export type SDKControlReloadPluginsResponse = z.infer<ReturnType<typeof schemas.SDKControlReloadPluginsResponseSchema>>
export type SDKControlMcpReconnectRequest = z.infer<ReturnType<typeof schemas.SDKControlMcpReconnectRequestSchema>>
export type SDKControlMcpToggleRequest = z.infer<ReturnType<typeof schemas.SDKControlMcpToggleRequestSchema>>
export type SDKControlStopTaskRequest = z.infer<ReturnType<typeof schemas.SDKControlStopTaskRequestSchema>>
export type SDKControlApplyFlagSettingsRequest = z.infer<ReturnType<typeof schemas.SDKControlApplyFlagSettingsRequestSchema>>
export type SDKControlGetSettingsRequest = z.infer<ReturnType<typeof schemas.SDKControlGetSettingsRequestSchema>>
export type SDKControlGetSettingsResponse = z.infer<ReturnType<typeof schemas.SDKControlGetSettingsResponseSchema>>
export type SDKControlElicitationRequest = z.infer<ReturnType<typeof schemas.SDKControlElicitationRequestSchema>>
export type SDKControlElicitationResponse = z.infer<ReturnType<typeof schemas.SDKControlElicitationResponseSchema>>
export type SDKControlRequestInner = z.infer<ReturnType<typeof schemas.SDKControlRequestInnerSchema>>
export type SDKControlRequest = z.infer<ReturnType<typeof schemas.SDKControlRequestSchema>>
export type ControlResponse = z.infer<ReturnType<typeof schemas.ControlResponseSchema>>
export type ControlErrorResponse = z.infer<ReturnType<typeof schemas.ControlErrorResponseSchema>>
export type SDKControlResponse = z.infer<ReturnType<typeof schemas.SDKControlResponseSchema>>
export type SDKControlCancelRequest = z.infer<ReturnType<typeof schemas.SDKControlCancelRequestSchema>>
export type SDKKeepAliveMessage = z.infer<ReturnType<typeof schemas.SDKKeepAliveMessageSchema>>
export type SDKUpdateEnvironmentVariablesMessage = z.infer<ReturnType<typeof schemas.SDKUpdateEnvironmentVariablesMessageSchema>>
export type StdoutMessage = z.infer<ReturnType<typeof schemas.StdoutMessageSchema>>
export type StdinMessage = z.infer<ReturnType<typeof schemas.StdinMessageSchema>>
