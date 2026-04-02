/**
 * OpenRouterSetup — First-run setup screen for OpenRouter API key.
 *
 * Presents a guided flow for entering an OpenRouter API key,
 * with option to use direct Anthropic API instead.
 */

import React, { useState, useCallback } from 'react'
import { Box, Link, Newline, Text } from '../ink.js'
import TextInput from './TextInput.js'
import { Select } from './CustomSelect/select.js'
import { Dialog } from './design-system/Dialog.js'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { saveGlobalConfig } from '../utils/config.js'
import { getClaudeConfigHomeDir } from '../utils/envUtils.js'

type Props = {
  onDone(apiKey?: string): void
}

type SetupMode = 'choose' | 'openrouter' | 'anthropic' | 'other'

export function OpenRouterSetup({ onDone }: Props): React.ReactNode {
  const [mode, setMode] = useState<SetupMode>('choose')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'key' | 'url'>('key')

  const handleSubmitKey = useCallback(() => {
    const key = apiKey.trim()
    if (!key) {
      setError('API key cannot be empty')
      return
    }
    process.env.ANTHROPIC_API_KEY = key

    if (mode === 'other' && step === 'key') {
      setStep('url')
      return
    }

    if (mode === 'other' && baseUrl.trim()) {
      process.env.ANTHROPIC_BASE_URL = baseUrl.trim()
    }

    // Persist API key to user settings.json so it survives across sessions.
    try {
      const settingsPath = join(getClaudeConfigHomeDir(), 'settings.json')
      let settings: Record<string, any> = {}
      try { settings = JSON.parse(readFileSync(settingsPath, 'utf-8')) } catch {}
      const env: Record<string, string> = { ...(settings.env || {}), ANTHROPIC_API_KEY: key }
      if (mode === 'anthropic') {
        env.ANTHROPIC_BASE_URL = 'https://api.anthropic.com'
      } else if (mode === 'other' && baseUrl.trim()) {
        env.ANTHROPIC_BASE_URL = baseUrl.trim()
      }
      settings.env = env
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
    } catch {}

    saveGlobalConfig(current => ({
      ...current,
      apiProvider: mode,
      hasCompletedApiSetup: true,
    }))

    onDone(key)
  }, [apiKey, baseUrl, mode, step, onDone])

  // Step 1: Choose provider
  if (mode === 'choose') {
    return (
      <Dialog title="API Provider Setup" color="info" onCancel={() => onDone()}>
        <Box flexDirection="column" gap={1}>
          <Text>
            <Text bold color="cyan">Welcome to OpenClaude!</Text>
          </Text>
          <Text>Choose your API provider:</Text>
          <Newline />
          <Select
            options={[
              {
                label: (
                  <Text>
                    <Text bold>OpenRouter</Text>
                    <Text dimColor> (recommended — access all models via one key)</Text>
                  </Text>
                ),
                value: 'openrouter',
              },
              {
                label: (
                  <Text>
                    <Text bold>Anthropic API</Text>
                    <Text dimColor> (direct — requires Anthropic API key)</Text>
                  </Text>
                ),
                value: 'anthropic',
              },
              {
                label: (
                  <Text>
                    <Text bold>Other OpenAI-compatible API</Text>
                    <Text dimColor> (custom base URL)</Text>
                  </Text>
                ),
                value: 'other',
              },
              {
                label: (
                  <Text dimColor>Skip — I'll set ANTHROPIC_API_KEY later</Text>
                ),
                value: 'skip',
              },
            ]}
            onChange={(value: string) => {
              if (value === 'skip') {
                onDone()
                return
              }
              if (value === 'anthropic') {
                process.env.ANTHROPIC_BASE_URL = 'https://api.anthropic.com'
              }
              setMode(value as SetupMode)
            }}
            onCancel={() => onDone()}
          />
          <Text dimColor>
            Use arrow keys to select, Enter to confirm
          </Text>
        </Box>
      </Dialog>
    )
  }

  // Step 2: Enter API key
  const providerInfo = {
    openrouter: {
      title: 'OpenRouter API Key',
      hint: 'Get your key at: https://openrouter.ai/keys',
      url: 'https://openrouter.ai/keys',
      prefix: 'sk-or-',
    },
    anthropic: {
      title: 'Anthropic API Key',
      hint: 'Get your key at: https://console.anthropic.com/settings/keys',
      url: 'https://console.anthropic.com/settings/keys',
      prefix: 'sk-ant-',
    },
    other: {
      title: step === 'url' ? 'API Base URL' : 'API Key',
      hint: step === 'url' ? 'Enter the base URL for your API provider (e.g. https://api.example.com/v1)' : 'Enter your API key',
      url: '',
      prefix: '',
    },
  }

  const info = providerInfo[mode]!

  return (
    <Dialog title={info.title} color="info" onCancel={() => setMode('choose')}>
      <Box flexDirection="column" gap={1}>
        {info.url && (
          <Text dimColor>
            {info.hint}
            <Newline />
            <Link url={info.url}>{info.url}</Link>
          </Text>
        )}
        {!info.url && <Text dimColor>{info.hint}</Text>}
        <Newline />
        {step === 'url' ? (
          <Box>
            <Text color="green">Base URL: </Text>
            <TextInput
              value={baseUrl}
              onChange={setBaseUrl}
              onSubmit={handleSubmitKey}
              onPaste={(text: string) => setBaseUrl(text.trim())}
              placeholder="https://api.example.com/v1"
            />
          </Box>
        ) : (
          <Box>
            <Text color="green">API Key: </Text>
            <TextInput
              value={apiKey}
              onChange={(val: string) => {
                setApiKey(val)
                setError(null)
              }}
              onSubmit={handleSubmitKey}
              onPaste={(text: string) => {
                setApiKey(text.trim())
                setError(null)
              }}
              placeholder={`${info.prefix}...`}
              mask="*"
            />
          </Box>
        )}
        {error && (
          <Text color="red">{error}</Text>
        )}
        <Newline />
        <Text dimColor>
          Paste your key and press Enter · Esc to go back
        </Text>
      </Box>
    </Dialog>
  )
}
