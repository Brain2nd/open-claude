/**
 * Stub type definitions for transport interface.
 */

export interface Transport {
  connect?(): Promise<void>
  send?(data: string): void
  close?(): void
  onMessage?(callback: (data: string) => void): void
  onClose?(callback: () => void): void
  onError?(callback: (error: Error) => void): void
  [key: string]: any
}
