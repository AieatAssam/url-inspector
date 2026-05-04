import { stripTrackingParams } from './urlCleaner'

export interface Hop {
  url: string
  statusCode: number
  statusText: string
  timingMs: number
  location: string | null
  error?: string
  isFinal: boolean
  synthetic?: boolean
}

const CORS_PROXY = 'https://corsproxy.io/?url='

const SHORTENER_DOMAINS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd',
  'buff.ly', 'shorturl.at', 'tiny.cc', 'bl.ink', 'lnkd.in', 'rb.gy',
  'rebrand.ly', 'cutt.ly', 'shorte.st', 'v.gd', 'clicky.me',
  'share.google',
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
  const TRACKING_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
    'msclkid', 'twclid', 'igshid', 'mc_cid', 'mc_eid',
    '_ga', '_gl', '_hsenc', '_hsmi', 'hsCtaTracking',
  ]
  try {
    const parsed = new URL(url)
    let count = 0
    for (const param of TRACKING_PARAMS) {
      if (parsed.searchParams.has(param)) count++
    }
    return count
  } catch {
    return 0
  }
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

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
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
      const isFinal = !isRedirect || !location

      hops.push({
        url: currentUrl,
        statusCode,
        statusText,
        timingMs,
        location,
        isFinal,
      })

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

  // Detect true final URL via proxy's x-final-url header (handles JS/interstitial redirects)
  const lastHop = finalHops[finalHops.length - 1]
  let finalUrl = lastHop?.url || normalizedUrl

  if (proxyUsed && lastHop && lastHop.statusCode === 200) {
    try {
      const probeUrl = `${CORS_PROXY}${encodeURIComponent(normalizedUrl)}`
      const probeResponse = await fetchWithTimeout(probeUrl, { redirect: 'follow', method: 'HEAD', mode: 'cors' })
      const proxyFinalUrl = probeResponse.headers.get('x-final-url')
      if (proxyFinalUrl && proxyFinalUrl !== lastHop.url) {
        finalHops.push({
          url: proxyFinalUrl,
          statusCode: 200,
          statusText: 'JS Redirect',
          timingMs: 0,
          location: null,
          isFinal: true,
          synthetic: true,
        })
        finalUrl = proxyFinalUrl
      }
    } catch {
      // Probe failed, stick with manual chain
    }
  }

  const totalRedirects = finalHops.filter(h => !h.isFinal).length
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
