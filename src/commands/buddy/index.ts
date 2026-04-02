import type { Command } from '../../commands.js'

const buddy = {
  type: 'local-jsx',
  name: 'buddy',
  description: 'Hatch and manage your companion',
  isEnabled: () => true,
  argumentHint: '[mute|reset|info]',
  load: () => import('./buddy.js'),
} satisfies Command

export default buddy
