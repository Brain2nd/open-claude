/**
 * Stub for ANT-ONLY CLI handlers.
 * These are internal-only commands stripped from the open-source build.
 */

export async function logHandler(_logId?: string | number): Promise<void> {}

export async function errorHandler(_number?: number): Promise<void> {}

export async function exportHandler(
  _source: string,
  _outputFile: string,
): Promise<void> {}

export async function taskCreateHandler(
  _subject: string,
  _opts: { description?: string; list?: string },
): Promise<void> {}

export async function taskListHandler(_opts: {
  list?: string
  pending?: boolean
  json?: boolean
}): Promise<void> {}

export async function taskGetHandler(
  _id: string,
  _opts: { list?: string },
): Promise<void> {}

export async function taskUpdateHandler(
  _id: string,
  _opts: {
    list?: string
    status?: string
    subject?: string
    description?: string
    owner?: string
    clearOwner?: boolean
  },
): Promise<void> {}

export async function taskDirHandler(_opts: { list?: string }): Promise<void> {}

export async function completionHandler(
  _shell: string,
  _opts: { output?: string },
  _program: any,
): Promise<void> {}
