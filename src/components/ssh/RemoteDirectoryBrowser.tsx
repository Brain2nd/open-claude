/**
 * Remote directory browser for SSH proxy mode.
 *
 * Rendered as a setup dialog before the REPL launches.
 * Lets the user navigate the remote filesystem and select a working directory.
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
): Promise<{ entries: DirEntry[]; resolvedPath: string }> {
  // Expand ~ to $HOME before quoting (single quotes prevent tilde expansion)
  const expandedPath = path === '~' ? '$HOME' : path.startsWith('~/') ? `$HOME/${path.slice(2)}` : shellQuote(path)
  const rpResult = await conn.exec(`realpath ${expandedPath} 2>/dev/null || echo ${expandedPath}`)
  const resolvedPath = rpResult.stdout.trim() || path

  // Use find with -printf for reliable parsing: type prefix + filename, one per line
  const dirResult = await conn.exec(
    `find ${shellQuote(resolvedPath)} -maxdepth 1 -mindepth 1 -type d -printf 'D %f\\n' 2>/dev/null | sort -f; ` +
    `find ${shellQuote(resolvedPath)} -maxdepth 1 -mindepth 1 -type f -printf 'F %f\\n' 2>/dev/null | sort -f; ` +
    `find ${shellQuote(resolvedPath)} -maxdepth 1 -mindepth 1 -type l -printf 'L %f\\n' 2>/dev/null | sort -f`
  )

  const entries: DirEntry[] = []

  // Parent directory
  if (resolvedPath !== '/') {
    const parent = resolvedPath.split('/').slice(0, -1).join('/') || '/'
    entries.push({ name: '..', isDir: true, fullPath: parent })
  }

  if (dirResult.code === 0 && dirResult.stdout.trim()) {
    for (const line of dirResult.stdout.trim().split('\n')) {
      if (!line || line.length < 3) continue
      const type = line[0]
      const name = line.slice(2)
      if (!name) continue

      const isDir = type === 'D' || type === 'L'
      const fullPath = resolvedPath === '/' ? `/${name}` : `${resolvedPath}/${name}`
      entries.push({
        name: isDir ? `${name}/` : name,
        isDir,
        fullPath,
      })
    }
  } else {
    // Fallback: try simple ls if find doesn't work (e.g., BusyBox)
    const lsResult = await conn.exec(`ls -1a ${shellQuote(resolvedPath)} 2>/dev/null`)
    if (lsResult.code === 0) {
      for (const name of lsResult.stdout.trim().split('\n')) {
        if (!name || name === '.' || name === '..') continue
        // Check if directory with test -d
        const isDir = (await conn.exec(`test -d ${shellQuote(resolvedPath + '/' + name)}`)).code === 0
        const fullPath = resolvedPath === '/' ? `/${name}` : `${resolvedPath}/${name}`
        entries.push({
          name: isDir ? `${name}/` : name,
          isDir,
          fullPath,
        })
      }
    }
  }

  return { entries, resolvedPath }
}

export function RemoteDirectoryBrowser({
  conn,
  initialPath,
  onSelect,
  onCancel,
}: Props): React.ReactNode {
  const [currentPath, setCurrentPath] = useState(initialPath)
  const [displayPath, setDisplayPath] = useState(initialPath)
  const [entries, setEntries] = useState<DirEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    loadDirectory(conn, currentPath)
      .then(({ entries: result, resolvedPath }) => {
        setEntries(result)
        setDisplayPath(resolvedPath)
        setLoading(false)
      })
      .catch((err: any) => {
        setError(err.message ?? String(err))
        setLoading(false)
      })
  }, [conn, currentPath])

  useKeybinding('confirm:no', onCancel, { context: 'Confirmation' })

  const dirEntries = entries.filter(e => e.isDir)
  const fileEntries = entries.filter(e => !e.isDir)

  const options: OptionWithDescription[] = [
    {
      value: '__SELECT_CURRENT__',
      label: `  [Use this directory]`,
      description: displayPath,
    },
    ...dirEntries.map((entry) => ({
      value: entry.name,
      label: `  ${entry.name}`,
      description: '',
    })),
    ...fileEntries.slice(0, 10).map((entry) => ({
      value: entry.name,
      label: `  ${entry.name}`,
      description: '',
    })),
  ]

  if (fileEntries.length > 10) {
    options.push({
      value: '__MORE__',
      label: `  ... and ${fileEntries.length - 10} more files`,
      description: '',
    })
  }

  const handleOptionChange = useCallback(
    (value: string) => {
      if (value === '__SELECT_CURRENT__') {
        conn.exec(`realpath ${shellQuote(currentPath)}`).then((result) => {
          onSelect(result.stdout.trim() || displayPath)
        }).catch(() => {
          onSelect(displayPath)
        })
        return
      }
      if (value === '__MORE__') return
      const entry = entries.find((e) => e.name === value)
      if (entry?.isDir) setCurrentPath(entry.fullPath)
    },
    [entries, currentPath, displayPath, conn, onSelect],
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
      <Text dimColor>Host: {conn.host}  Path: {displayPath}</Text>
      <Text dimColor>{dirEntries.length} dirs, {fileEntries.length} files</Text>
      <Text> </Text>
      <Select
        options={options}
        onChange={handleOptionChange}
        visibleOptionCount={20}
      />
      <Text> </Text>
      <Text dimColor>Enter: navigate/select | Esc: cancel</Text>
    </Box>
  )
}
