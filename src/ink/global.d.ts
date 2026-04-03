import 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'ink-box': any
      'ink-text': any
      'ink-link': any
      'ink-raw-ansi': any
    }
  }
}
