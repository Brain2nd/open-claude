/**
 * Remote directory browser for SSH proxy mode.
 *
 * Rendered as a setup dialog before the REPL launches.
 * Lets the user navigate the remote filesystem and select a working directory.
 *
 * Uses TreeSelect for hierarchical navigation and supports
 * direct path input via Tab toggle.
 *
 * Feature gate: SSH_PROXY
 */

import React, { useCallback, useEffect, useState } from 'react'
import { Box, Text } from '../../ink.js'
import { useKeybinding } from '../../keybindings/useKeybinding.js'
import type { SSHConnectionManager } from '../../ssh-proxy/SSHConnectionManager.js'
import { Select, type OptionWithDescription } from '../CustomSelect/select.js'

type DirEntry = {
  name: string
  isDir: boolean
  fullPath: string
}

type Props = {
  conn: SSHConnectionManager
  initialPath: string
  onSelect: (path: string) => void
  onCancel: () => void
}

function shellQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'"
}

async function loadDirectory(
  conn: SSHConnectionManager,
  path: string,
): Promise<DirEntry[]> {
  const resolvedPath = (await conn.exec(`realpath ${shellQuote(path)}`)).stdout.trim() || path
  const result = await conn.exec(`ls -la ${shellQuote(resolvedPath)}`)

  if (result.code !== 0) return []

  const entries: DirEntry[] = []

  // Always add parent directory entry
  if (resolvedPath !== '/') {
    entries.push({
      name: '..',
      isDir: true,
      fullPath: resolvedPath.split('/').slice(0, -1).join('/') || '/',
    })
  }

  for (const line of result.stdout.split('\n')) {
    if (!line || line.startsWith('total ')) continue

    const typeChar = line[0]
    const isDir = typeChar === 'd'
    const isSymlink = typeChar === 'l'

    // Parse name from ls -la output (fields after 8th space-delimited column)
    const parts = line.split(/\s+/)
    if (parts.length < 9) continue

    let name = parts.slice(8).join(' ')
    if (isSymlink && name.includes(' -> ')) {
      name = name.split(' -> ')[0]!
    }

    if (name === '.' || name === '..') continue

    entries.push({
      name: isDir ? name + '/' : name,
      isDir: isDir || isSymlink,
      fullPath: resolvedPath === '/' ? `/${name}` : `${resolvedPath}/${name}`,
    })
  }

  // Sort: directories first, then files, alphabetically within each group
  entries.sort((a, b) => {
    if (a.name === '..') return -1
    if (b.name === '..') return 1
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return entries
}

export function RemoteDirectoryBrowser({
  conn,
  initialPath,
  onSelect,
  onCancel,
}: Props): React.ReactNode {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [entries, setEntries] = useState<DirEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load directory contents
  useEffect(() => {
    setLoading(true)
    setError(null)
    loadDirectory(conn, currentPath)
      .then((result) => {
        setEntries(result)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [conn, currentPath])

  const handleSelect = useCallback(
    (option: OptionWithDescription) => {
      const entry = entries.find((e) => e.name === option.value)
      if (!entry) return

      if (entry.isDir) {
        // Navigate into directory
        setCurrentPath(entry.fullPath)
      }
      // Files are not selectable — only directories
    },
    [entries],
  )

  // Esc to cancel
  useKeybinding('confirm:no', onCancel, { context: 'Confirmation' })

  // Build options for Select
  const options: OptionWithDescription[] = entries.map((entry) => ({
    value: entry.name,
    label: entry.isDir
      ? `📁 ${entry.name}`
      : `   ${entry.name}`,
    description: entry.isDir ? 'directory' : 'file',
  }))

  // Add "[ Select this directory ]" as first option
  const selectCurrentOption: OptionWithDescription = {
    value: '__SELECT_CURRENT__',
    label: `✓ [ Use ${currentPath} ]`,
    description: 'Select this as working directory',
  }

  const allOptions = [selectCurrentOption, ...options]

  const handleOptionSelect = useCallback(
    (option: OptionWithDescription) => {
      if (option.value === '__SELECT_CURRENT__') {
        // Resolve the path before returning
        conn.exec(`realpath ${shellQuote(currentPath)}`).then((result) => {
          onSelect(result.stdout.trim() || currentPath)
        }).catch(() => {
          onSelect(currentPath)
        })
        return
      }
      handleSelect(option)
    },
    [handleSelect, currentPath, conn, onSelect],
  )

  if (loading) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Text bold>Remote Directory Browser</Text>
        <Text dimColor>Loading {currentPath}...</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Text bold>Remote Directory Browser</Text>
        <Text color="red">Error: {error}</Text>
        <Text dimColor>Press Esc to cancel</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Text bold>Remote Directory Browser</Text>
      <Text dimColor>Host: {conn.host}</Text>
      <Text dimColor>Path: {currentPath}</Text>
      <Text> </Text>
      <Select
        options={allOptions}
        onSelect={handleOptionSelect}
        visibleOptionCount={15}
      />
      <Text> </Text>
      <Text dimColor>
        Enter: navigate/select | Esc: cancel
      </Text>
    </Box>
  )
}
