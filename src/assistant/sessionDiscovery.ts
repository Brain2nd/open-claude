export type AssistantSession = { sessionId: string; title?: string; createdAt: number }
export async function discoverAssistantSessions(): Promise<AssistantSession[]> { return [] }
