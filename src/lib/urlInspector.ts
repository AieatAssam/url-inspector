import { stripTrackingParams, extractTrackingParams } from './urlCleaner'

/** Headers worth surfacing in advanced mode */
const INTERESTING_HEADERS = [
  'content-type', 'content-length', 'server', 'cache-control',
  'x-cache-status', 'x-final-url', 'x-proxy-time',
  'set-cookie', 'strict-transport-security', 'x-frame-options',
  'x-content-type-options', 'referrer-policy',
]

const STATUS_MEANINGS: Record<number, string> = {
  200: 'OK \u2014 request succeeded',
  201: 'Created \u2014 resource created',
  204: 'No Content \u2014 request succeeded, no body',
  301: 'Moved Permanently \u2014 resource has a new URL, update bookmarks',
  302: 'Found \u2014 temporary redirect',
  303: 'See Other \u2014 redirect to another resource via GET',
  304: 'Not Modified \u2014 cached version is still valid',
  307: 'Temporary Redirect \u2014 repeat the request at the new URL',
  308: 'Permanent Redirect \u2014 resource has a new permanent URL',
  400: 'Bad Request \u2014 server could not understand the request',
  401: 'Unauthorized \u2014 authentication required',
  403: 'Forbidden \u2014 access denied',
  404: 'Not Found \u2014 resource does not exist',
  429: 'Too Many Requests \u2014 rate limited',
  500: 'Internal Server Error \u2014 server encountered an error',
  502: 'Bad Gateway \u2014 upstream server error',
  503: 'Service Unavailable \u2014 server is temporarily overloaded',
}

function hopHeaders(response: Response): Record<string, string> {
  const result: Record<string, string> = {}
  for (const key of INTERESTING_HEADERS) {
    const val = response.headers.get(key)
    if (val) result[key] = val
  }
  return result
}

export interface Hop {
  url: string
  statusCode: number
  statusText: string
  timingMs: number
  location: string | null
  error?: string
  isFinal: boolean
  synthetic?: boolean
  headers?: Record<string, string>
  statusMeaning?: string
}

const CORS_PROXY = 'https://api.codetabs.com/v1/proxy/?quest='

// Optional Cloudflare Worker for accurate redirect resolution (bypasses CORS).
// Set this to your deployed worker URL, e.g.:
//   https://url-inspector-resolver.<username>.workers.dev/resolve?url=
// When null, falls back to showing "destination blocked" for scraping-blocked sites.
const REDIRECT_RESOLVER: string | null = null
// To enable, set: const REDIRECT_RESOLVER = 'https://your-worker.workers.dev/resolve?url='

const SHORTENER_DOMAINS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd',
  'buff.ly', 'shorturl.at', 'tiny.cc', 'bl.ink', 'lnkd.in', 'rb.gy',
  'rebrand.ly', 'cutt.ly', 'shorte.st', 'v.gd', 'clicky.me',
  'share.google', 'flip.it', 'flipboard.com',
]

/** Known URL wrapper patterns that use query params to store the real destination */
interface WrapperPattern {
  hostname: string
  pathPattern: RegExp
  param: string
  label: string
}

const URL_WRAPPERS: WrapperPattern[] = [
  { hostname: 'www.google.com', pathPattern: /^\/url\b/, param: 'q', label: 'Google Safe Browsing' },
  { hostname: 'google.com',    pathPattern: /^\/url\b/, param: 'q', label: 'Google Safe Browsing' },
  { hostname: 'l.facebook.com', pathPattern: /^\/l\.php\b/, param: 'u', label: 'Facebook Link' },
  { hostname: 'out.reddit.com', pathPattern: /./, param: 'url', label: 'Reddit Outbound' },
  { hostname: 'www.linkedin.com', pathPattern: /^\/feed\/update\//, param: 'url', label: 'LinkedIn Feed' },
  { hostname: 'linkedin.com', pathPattern: /^\/feed\/update\//, param: 'url', label: 'LinkedIn Feed' },
]

export function isShortUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    return SHORTENER_DOMAINS.includes(hostname)
  } catch {
    return false
  }
}

export function countTrackingParams(url: string): number {
  return extractTrackingParams(url).length
}

/**
 * Detect if a URL is a known URL wrapper and extract the real destination.
 */
export function unwrapUrl(url: string): { wrapper: WrapperPattern; destination: string } | null {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname

    for (const pattern of URL_WRAPPERS) {
      if (pattern.hostname === hostname && pattern.pathPattern.test(parsed.pathname)) {
        const destination = parsed.searchParams.get(pattern.param)
        if (destination) {
          return { wrapper: pattern, destination }
        }
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Resolve a shortened URL using our Cloudflare Worker (server-side, no CORS).
 * The worker fetches the URL with redirect: 'manual' and returns the Location
 * header. This is the only way to get the exact redirect URL from the browser.
 * Falls back to null if the worker is not configured.
 */
async function resolveViaWorker(shortUrl: string): Promise<string | null> {
  if (!REDIRECT_RESOLVER) return null
  try {
    const encoded = encodeURIComponent(shortUrl)
    const response = await fetchWithTimeout(`${REDIRECT_RESOLVER}${encoded}`, {
      method: 'GET',
      mode: 'cors',
    }, 8000)
    if (!response.ok) return null
    const data: { status: number; location?: string; hops?: string[]; error?: string } = await response.json()
    if (data.error) return null
    // Return the final URL from the hop chain, or the location header
    if (data.hops && data.hops.length > 1) {
      return data.hops[data.hops.length - 1]
    }
    if (data.location) return data.location
    return null
  } catch {
    return null
  }
}

// Realistic User-Agent to avoid 403 blocks from URL shorteners and link services
const FAKE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: Object.assign({ 'User-Agent': FAKE_UA }, options.headers as Record<string, string> ?? {}),
    })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}

async function followChain(url: string, useProxy: boolean, maxHops = 20): Promise<{ hops: Hop[]; proxyUsed: boolean }> {
  const hops: Hop[] = []
  let currentUrl = url
  let proxyUsed = useProxy

  // First, check if the URL is a known wrapper and extract the destination
  const wrapper = unwrapUrl(currentUrl)
  if (wrapper) {
    hops.push({
      url: currentUrl,
      statusCode: 200,
      statusText: wrapper.wrapper.label,
      timingMs: 0,
      location: wrapper.destination,
      isFinal: false,
      synthetic: true,
      statusMeaning: 'URL wrapper \u2014 extracted from ' + wrapper.wrapper.label,
    })
    currentUrl = wrapper.destination
  }

  for (let i = 0; i < maxHops; i++) {
    const startTime = performance.now()
    const fetchUrl = proxyUsed ? `${CORS_PROXY}${encodeURIComponent(currentUrl)}` : currentUrl

    try {
      const response = await fetchWithTimeout(fetchUrl, {
        redirect: 'manual',
        mode: proxyUsed ? 'cors' : 'cors',
      })

      const endTime = performance.now()
      const timingMs = Math.round(endTime - startTime)

      // Find the actual redirect URL
      let location: string | null = null
      try {
        location = response.headers.get('Location') || response.headers.get('location')
      } catch {
        // Location header not available
      }

      const statusCode = response.status
      const statusText = response.statusText

      // Check if this is a redirect
      const isRedirect = statusCode >= 300 && statusCode < 400
      const isClientError = statusCode >= 400 && statusCode < 500
      const isServerError = statusCode >= 500

      // If direct fetch returned an error, retry via CORS proxy
      if ((isClientError || isServerError) && !proxyUsed) {
        proxyUsed = true
        continue
      }

      const isFinal = !isRedirect || !location

      hops.push({
        url: currentUrl,
        statusCode,
        statusText,
        timingMs,
        location,
        isFinal,
        headers: hopHeaders(response),
        statusMeaning: STATUS_MEANINGS[statusCode],
      })

      // When using the proxy, the response follows redirects server-side.
      // Extract the final destination URL from the response HTML body.
      if (isFinal && proxyUsed && statusCode === 200) {
        try {
          const cloned = response.clone()
          const reader = cloned.body?.getReader()
          let chunk = ''
          if (reader) {
            let bytesRead = 0
            while (bytesRead < 150_000) {
              const { done, value } = await reader.read()
              if (done) break
              chunk += new TextDecoder().decode(value, { stream: true })
              bytesRead += value.length
            }
            reader.cancel()
          }

          // Try full og:url first, then canonical URL
          let extractedUrl: string | null = null
          const ogUrlMatch = chunk.match(/<meta[^>]+property\s*=\s*["']og:url["'][^>]+content\s*=\s*["']([^"']+)["']/i)
          const canonMatch = chunk.match(/<link[^>]+rel\s*=\s*["']canonical["'][^>]+href\s*=\s*["']([^"']+)["']/i)
          extractedUrl = ogUrlMatch?.[1] || canonMatch?.[1] || null

          if (extractedUrl) {
            const normalize = (u: string) => u.replace(/\/$/, '')
            if (normalize(extractedUrl) !== normalize(currentUrl)) {
              hops.push({
                url: extractedUrl,
                statusCode: 200,
                statusText: 'Proxy Resolved',
                timingMs: 0,
                location: null,
                isFinal: true,
                synthetic: true,
                statusMeaning: extractedUrl.startsWith('https://') && new URL(extractedUrl).hostname !== new URL(currentUrl).hostname
                  ? 'Redirect resolved via CORS proxy \u2014 final page blocked scraping, domain detected from title'
                  : 'Redirect resolved via CORS proxy \u2014 server-side redirects were followed',
              })
            }
          } else if (isShortUrl(currentUrl)) {
            // Even without extracting a URL, mark that a redirect was resolved.
            // inspectUrl will try the Cloudflare Worker fallback if configured.
            hops.push({
              url: currentUrl,
              statusCode: 200,
              statusText: 'Redirected \u2192 awaiting resolver',
              timingMs: 0,
              location: null,
              isFinal: true,
              synthetic: true,
              statusMeaning: 'Redirect detected via CORS proxy \u2014 final destination will be resolved by optional server-side resolver',
            })
          }
        } catch {
          // Body parsing failed, use the original hop as-is
        }
      }

      if (isFinal) break

      // Resolve the next URL
      try {
        currentUrl = new URL(location!, currentUrl).href
      } catch {
        // Invalid location header
        hops[hops.length - 1].isFinal = true
        break
      }

      // If we get an opaque response from direct fetch, switch to proxy
      if (statusCode === 0 && !proxyUsed) {
        proxyUsed = true
        hops.pop()
        i--
        continue
      }

    } catch (err) {
      const endTime = performance.now()

      // If direct fetch failed and we haven't tried proxy yet
      if (!proxyUsed) {
        proxyUsed = true
        continue
      }

      hops.push({
        url: currentUrl,
        statusCode: 0,
        statusText: 'Error',
        timingMs: Math.round(endTime - startTime),
        location: null,
        error: err instanceof TypeError ? 'CORS / Network error' : (err as Error).message,
        isFinal: true,
        statusMeaning: 'Request failed \u2014 ' + (err instanceof TypeError ? 'CORS or network issue' : (err as Error).message),
      })
      break
    }
  }

  return { hops, proxyUsed }
}

export interface InspectionResult {
  originalUrl: string
  cleanUrl: string | null
  hops: Hop[]
  totalRedirects: number
  totalTiming: number
  finalUrl: string
  proxyUsed: boolean
  wrapperDetected: boolean
}

export async function inspectUrl(url: string): Promise<InspectionResult> {
  // Normalize URL
  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl
  }

  const cleanUrl = stripTrackingParams(normalizedUrl)
  const cleanUrlStr = cleanUrl !== normalizedUrl ? cleanUrl : null

  let { hops, proxyUsed } = await followChain(normalizedUrl, false)

  // If direct failed or returned empty, retry with proxy for the whole chain
  let finalHops = hops
  if (hops.length === 0 || (hops.length === 1 && hops[0].error)) {
    const result = await followChain(normalizedUrl, true)
    finalHops = result.hops
    proxyUsed = result.proxyUsed
  }

  // Detect the true final URL — already handled by followChain which parses
  // the proxy response HTML inline (extracts og:url or canonical URL).
  // Also check for x-final-url header (some proxies set this).
  const lastHop = finalHops[finalHops.length - 1]
  let finalUrl = lastHop?.url || normalizedUrl

  // Additional fallback: if the proxy was used and inline HTML parsing failed
  // (e.g. Forbes JS challenge), try our Cloudflare Worker for accurate resolution.
  // The worker runs server-side, bypassing browser CORS to read the Location header.
  // Falls back gracefully if worker is not configured or unavailable.
  if (proxyUsed && lastHop && lastHop.synthetic && finalUrl === normalizedUrl) {
    const resolved = await resolveViaWorker(normalizedUrl)
    if (resolved) {
      finalHops[finalHops.length - 1] = {
        url: resolved,
        statusCode: 200,
        statusText: 'Proxy Resolved',
        timingMs: 0,
        location: null,
        isFinal: true,
        synthetic: true,
        statusMeaning: 'Redirect resolved via Cloudflare Worker \u2014 final URL from server-side redirect chain',
      }
      finalUrl = resolved
    }
  }

  // Also try x-final-url (some proxies set this)
  if (proxyUsed && lastHop && lastHop.statusCode === 200) {
    const proxyFinalUrl = lastHop.headers?.['x-final-url'] ?? null
    if (proxyFinalUrl) {
      const normalizeUrl = (u: string) => u.replace(/\/$/, '')
      if (normalizeUrl(proxyFinalUrl) !== normalizeUrl(finalUrl)) {
        finalHops.push({
          url: proxyFinalUrl,
          statusCode: 200,
          statusText: 'Proxy Resolved',
          timingMs: 0,
          location: null,
          isFinal: true,
          synthetic: true,
          statusMeaning: 'Redirect resolved via CORS proxy \u2014 final URL from proxy header',
        })
        finalUrl = proxyFinalUrl
      }
    }
  }

  const totalRedirects = Math.max(0, finalHops.length - 1)
  const totalTiming = finalHops.reduce((sum, h) => sum + h.timingMs, 0)

  return {
    originalUrl: normalizedUrl,
    cleanUrl: cleanUrlStr,
    hops: finalHops,
    totalRedirects,
    totalTiming,
    finalUrl,
    proxyUsed,
    wrapperDetected: finalHops.some(h => h.synthetic),
  }
}
