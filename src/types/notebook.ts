/**
 * Stub type definitions for Jupyter notebook types.
 */

export type NotebookCellType = 'code' | 'markdown' | 'raw'

export interface NotebookOutputImage {
  image_data: string
  media_type: 'image/png' | 'image/jpeg'
}

export interface NotebookCellSourceOutput {
  output_type: string
  text?: string
  image?: NotebookOutputImage
  [key: string]: any
}

export interface NotebookCellOutput {
  output_type: 'stream' | 'execute_result' | 'display_data' | 'error'
  text?: string | string[]
  data?: Record<string, any>
  ename?: string
  evalue?: string
  traceback?: string[]
  [key: string]: any
}

export interface NotebookCell {
  cell_type: NotebookCellType
  source: string | string[]
  id?: string
  execution_count?: number | null
  outputs?: NotebookCellOutput[]
  metadata?: Record<string, any>
  [key: string]: any
}

export interface NotebookCellSource {
  cellType: NotebookCellType
  source: string
  execution_count?: number
  cell_id: string
  language?: string
  outputs?: NotebookCellSourceOutput[]
  [key: string]: any
}

export interface NotebookContent {
  cells: NotebookCell[]
  metadata?: {
    kernelspec?: {
      language?: string
      [key: string]: any
    }
    [key: string]: any
  }
  nbformat?: number
  nbformat_minor?: number
  [key: string]: any
}
