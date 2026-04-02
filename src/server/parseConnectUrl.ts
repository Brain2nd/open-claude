/**
 * Parse a cc:// connect URL into server URL and auth token.
 *
 * Format: cc://TOKEN@HOST:PORT or cc://HOST:PORT
 */

export function parseConnectUrl(ccUrl: string): {
  serverUrl: string
  authToken?: string
} {
  // Strip cc:// prefix
  let url = ccUrl.replace(/^cc:\/\//, '')

  let authToken: string | undefined
  const atIndex = url.indexOf('@')
  if (atIndex !== -1) {
    authToken = url.slice(0, atIndex)
    url = url.slice(atIndex + 1)
  }

  // Ensure http:// prefix
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`
  }

  return { serverUrl: url, authToken }
}
