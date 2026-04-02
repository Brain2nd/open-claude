import React from 'react'
type Props = { sessions: unknown[]; onSelect: (id: string) => void; onCancel: () => void }
export function AssistantSessionChooser(_props: Props): React.ReactElement {
  return React.createElement('box', null, 'AssistantSessionChooser')
}
