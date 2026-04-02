/**
 * DangerousBackend — spawns claude sessions with --dangerously-skip-permissions.
 *
 * Used by the server to create unrestricted sessions.
 * This backend is only accessible when explicitly started with `claude server`.
 */

import { spawn, type ChildProcess } from 'child_process'
import { resolve } from 'path'

export class DangerousBackend {
  /**
   * Spawn a claude CLI subprocess for a new session.
   */
  spawnSession(
    cwd: string,
    options: {
      sessionId?: string
      prompt?: string
      outputFormat?: string
      systemPrompt?: string
      appendSystemPrompt?: string
      model?: string
      permissionMode?: string
    } = {},
  ): ChildProcess {
    const args: string[] = [
      '--print', options.prompt || '',
      '--dangerously-skip-permissions',
      '--output-format', options.outputFormat || 'stream-json',
    ]

    if (options.sessionId) {
      args.push('--session-id', options.sessionId)
    }
    if (options.model) {
      args.push('--model', options.model)
    }
    if (options.systemPrompt) {
      args.push('--system-prompt', options.systemPrompt)
    }
    if (options.appendSystemPrompt) {
      args.push('--append-system-prompt', options.appendSystemPrompt)
    }

    // Resolve the CLI entry point
    const cliPath = resolve(__dirname, '../../cli.js')

    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CLAUDE_CODE_REMOTE: 'true',
      },
    })

    return child
  }
}
