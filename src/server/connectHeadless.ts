/**
 * Headless connection — runs a session against a remote server in -p mode.
 *
 * Used by `claude open <cc-url> -p` for non-interactive output.
 */

type DirectConnectConfig = {
  wsUrl: string
  sessionId: string
  authToken: string
}

/**
 * Run a headless session against a remote server.
 * Sends the prompt, streams the response to stdout, then exits.
 */
export async function runConnectHeadless(
  config: DirectConnectConfig,
  prompt: string,
  outputFormat: string,
  interactive: boolean,
): Promise<void> {
  // Dynamic import to avoid pulling ws into the main bundle
  const { default: WebSocket } = await import('ws')

  const ws = new WebSocket(config.wsUrl, {
    headers: {
      Authorization: `Bearer ${config.authToken}`,
    },
  })

  return new Promise<void>((resolve, reject) => {
    ws.on('open', () => {
      // Send the prompt
      ws.send(JSON.stringify({
        type: 'message',
        content: prompt,
        outputFormat,
      }))
    })

    ws.on('message', (data: Buffer) => {
      const msg = data.toString()
      if (outputFormat === 'stream-json' || outputFormat === 'json') {
        process.stdout.write(msg + '\n')
      } else {
        // Text mode — extract text content
        try {
          const parsed = JSON.parse(msg)
          if (parsed.type === 'assistant' && parsed.content) {
            for (const block of parsed.content) {
              if (block.type === 'text') {
                process.stdout.write(block.text)
              }
            }
          }
          if (parsed.type === 'result') {
            if (!interactive) {
              ws.close()
            }
          }
        } catch {
          process.stdout.write(msg)
        }
      }
    })

    ws.on('close', () => resolve())
    ws.on('error', (err) => reject(err))

    // Handle stdin for interactive mode
    if (interactive) {
      process.stdin.setEncoding('utf-8')
      process.stdin.on('data', (data: string) => {
        ws.send(JSON.stringify({
          type: 'message',
          content: data.trim(),
        }))
      })
      process.stdin.on('end', () => {
        ws.close()
      })
    }
  })
}
