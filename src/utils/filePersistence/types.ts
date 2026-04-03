// Stub: filePersistence types (not in public distribution, behind FILE_PERSISTENCE feature flag)
export const DEFAULT_UPLOAD_CONCURRENCY = 5
export const FILE_COUNT_LIMIT = 1000
export const OUTPUTS_SUBDIR = 'outputs'
export type FileMetadata = Record<string, unknown>

export interface FailedPersistence {
  path?: string
  filename?: string
  error?: any
  [key: string]: any
}

export interface FilesPersistedEventData {
  [key: string]: any
}

export interface PersistedFile {
  path?: string
  filename?: string
  file_id?: string
  [key: string]: any
}

export type TurnStartTime = number
