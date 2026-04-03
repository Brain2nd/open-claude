export function useFrustrationDetection(..._args: any[]): {
  state: 'closed' | 'open' | 'expanded'
  handleTranscriptSelect: (...args: any[]) => void
  [key: string]: any
} {
  return { state: 'closed', handleTranscriptSelect: () => {} }
}
