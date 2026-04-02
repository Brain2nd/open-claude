import React, { useCallback, useEffect, useState } from 'react'
import { Box, Text } from '../../ink.js'
import { useKeybinding } from '../../keybindings/useKeybinding.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import {
  getCompanion,
  roll,
} from '../../buddy/companion.js'
import { renderSprite } from '../../buddy/sprites.js'
import {
  RARITY_COLORS,
  RARITY_STARS,
} from '../../buddy/types.js'
import type { Theme } from '../../utils/theme.js'
import type {
  LocalJSXCommandOnDone,
} from '../../types/command.js'

// Name pools — deterministic from inspirationSeed
const PREFIXES = [
  'Captain', 'Professor', 'Sir', 'Lady', 'Baron',
  'Doctor', 'Agent', 'Lord', 'Duke', 'General',
  'Chief', 'Elder', 'Grand', 'Royal', 'Noble',
]
const NAMES = [
  'Nibbles', 'Sprocket', 'Widget', 'Biscuit', 'Mochi',
  'Pickle', 'Waffle', 'Noodle', 'Pudding', 'Dumpling',
  'Tofu', 'Ramen', 'Sushi', 'Latte', 'Mocha',
  'Pixel', 'Glitch', 'Byte', 'Chip', 'Spark',
  'Bubbles', 'Fizzle', 'Zigzag', 'Wobble', 'Tangle',
  'Clover', 'Pebble', 'Ripple', 'Ember', 'Frost',
]
const PERSONALITIES = [
  'cheerful and easily distracted by shiny objects',
  'quietly wise but terrible at giving directions',
  'brave but afraid of semicolons',
  'loves refactoring and hates merge conflicts',
  'obsessed with naming variables properly',
  'thinks every bug is a feature in disguise',
  'speaks in riddles when tired',
  'collects error messages as souvenirs',
  'believes tabs and spaces can coexist',
  'dreams of becoming a senior engineer',
  'always optimistic about deployment day',
  'suspicious of any code that works on the first try',
  'tells terrible programming jokes at the worst times',
  'thinks recursion is the answer to everything',
  'keeps a diary of the weirdest bugs encountered',
]

function generateSoul(seed: number): { name: string; personality: string } {
  let s = seed >>> 0
  const rng = () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const hasPrefix = rng() < 0.3
  const prefix = hasPrefix
    ? PREFIXES[Math.floor(rng() * PREFIXES.length)]
    : ''
  const baseName = NAMES[Math.floor(rng() * NAMES.length)]!
  const name = prefix ? `${prefix} ${baseName}` : baseName
  const personality =
    PERSONALITIES[Math.floor(rng() * PERSONALITIES.length)]!

  return { name, personality }
}

function CompanionCard({
  onDone,
  firstHatch,
}: {
  onDone: LocalJSXCommandOnDone
  firstHatch: boolean
}): React.ReactNode {
  const c = getCompanion()

  const dismiss = useCallback(() => {
    if (!c) {
      onDone('Something went wrong.', { display: 'system' })
      return
    }
    if (firstHatch) {
      onDone(
        `Your companion ${c.name} the ${c.species} is here! They'll hang out beside your input.`,
        { display: 'system' },
      )
    } else {
      onDone(undefined, { display: 'skip' })
    }
  }, [onDone, c, firstHatch])

  useKeybinding('confirm:yes', dismiss, { context: 'Confirmation' })
  useKeybinding('confirm:no', dismiss, { context: 'Confirmation' })

  if (!c) {
    onDone('Something went wrong.', { display: 'system' })
    return null
  }

  const sprite = renderSprite(c, 0)
  const rarityColor = RARITY_COLORS[c.rarity] as keyof Theme
  const stars = RARITY_STARS[c.rarity]
  const age = Math.floor((Date.now() - c.hatchedAt) / 86400000)
  const ageStr = age === 0 ? 'hatched today' : `${age}d old`

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box flexDirection="row" gap={2}>
        <Box flexDirection="column">
          {sprite.map((line, i) => (
            <Text key={i} color={rarityColor as string}>
              {line}
            </Text>
          ))}
        </Box>
        <Box flexDirection="column">
          <Text bold color={rarityColor as string}>
            {c.name}
          </Text>
          <Text dimColor>
            {c.species} {stars}
          </Text>
          <Text dimColor>{c.rarity}{c.shiny ? ' ✦ shiny!' : ''} · {ageStr}</Text>
          <Text> </Text>
          <Text italic dimColor>
            "{c.personality}"
          </Text>
          <Text> </Text>
          {Object.entries(c.stats).map(([stat, val]) => (
            <Text key={stat} dimColor>
              {stat.padEnd(10)} {'█'.repeat(Math.floor(val / 10))}{'░'.repeat(10 - Math.floor(val / 10))} {val}
            </Text>
          ))}
        </Box>
      </Box>
      <Text dimColor>
        Press Enter or Esc to close
      </Text>
    </Box>
  )
}

function HatchAnimation({
  onDone,
}: {
  onDone: LocalJSXCommandOnDone
}): React.ReactNode {
  const [phase, setPhase] = useState<
    'shake1' | 'shake2' | 'shake3' | 'hatch' | 'card'
  >('shake1')
  const [eggFrame, setEggFrame] = useState(0)

  useEffect(() => {
    const { bones, inspirationSeed } = roll()
    const soul = generateSoul(inspirationSeed)

    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setEggFrame(1), 400))
    timers.push(setTimeout(() => setPhase('shake2'), 800))
    timers.push(setTimeout(() => setEggFrame(2), 1200))
    timers.push(setTimeout(() => setPhase('shake3'), 1600))
    timers.push(setTimeout(() => setEggFrame(3), 2000))
    timers.push(
      setTimeout(() => {
        // Persist both bones and soul so the companion is fully stored
        const stored = {
          ...bones,
          name: soul.name,
          personality: soul.personality,
          hatchedAt: Date.now(),
        }
        saveGlobalConfig(prev => ({
          ...prev,
          companion: stored,
        }))
        setPhase('hatch')
      }, 2400),
    )
    timers.push(setTimeout(() => setPhase('card'), 3200))

    return () => timers.forEach(clearTimeout)
  }, [])

  if (phase === 'card') {
    return <CompanionCard onDone={onDone} firstHatch={true} />
  }

  const EGG_FRAMES = [
    ['   .---.   ', '  /     \\  ', ' |       | ', '  \\     /  ', "   '---'   "],
    ['   .---.   ', '  / \\ / \\  ', ' |       | ', '  \\     /  ', "   '---'   "],
    ['   .-|-.   ', '  / \\ / \\  ', ' | /   \\ | ', '  \\  |  /  ', "   '---'   "],
    ['    \\|/    ', '   . . .   ', '  *     *  ', '   . . .   ', '    /|\\    '],
  ]

  const frame = EGG_FRAMES[Math.min(eggFrame, EGG_FRAMES.length - 1)]!
  const label =
    phase === 'shake1'
      ? '...'
      : phase === 'shake2'
        ? '...!'
        : phase === 'shake3'
          ? '...!!'
          : '✦ Hatched!'

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {frame.map((line, i) => (
        <Text key={i}>{line}</Text>
      ))}
      <Text bold>{label}</Text>
    </Box>
  )
}

export async function call(
  onDone: LocalJSXCommandOnDone,
  _context: unknown,
  args: string,
): Promise<React.ReactNode> {
  const subcommand = args.trim().toLowerCase()

  // /buddy mute
  if (subcommand === 'mute') {
    const muted = getGlobalConfig().companionMuted
    saveGlobalConfig(prev => ({ ...prev, companionMuted: !muted }))
    onDone(muted ? 'Companion unmuted.' : 'Companion muted.', {
      display: 'system',
    })
    return null
  }

  // /buddy reset — release and immediately re-hatch
  if (subcommand === 'reset') {
    saveGlobalConfig(prev => {
      const { companion: _, ...rest } = prev
      return rest as typeof prev
    })
    return <HatchAnimation onDone={onDone} />
  }

  // Already hatched — show card (for /buddy, /buddy info, /buddy stats)
  if (getCompanion()) {
    return <CompanionCard onDone={onDone} firstHatch={false} />
  }

  // No companion yet — /buddy info without companion
  if (subcommand === 'info' || subcommand === 'stats') {
    onDone("You don't have a companion yet. Run /buddy to hatch one!", {
      display: 'system',
    })
    return null
  }

  // First hatch
  return <HatchAnimation onDone={onDone} />
}
