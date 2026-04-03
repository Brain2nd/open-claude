/**
 * Type definitions for secure storage types.
 */

export type SecureStorageData = Record<string, any>

export interface SecureStorage {
  name: string
  read(): SecureStorageData | null
  readAsync(): Promise<SecureStorageData | null>
  update(data: SecureStorageData): { success: boolean; warning?: string }
  delete(): boolean
  [key: string]: any
}
