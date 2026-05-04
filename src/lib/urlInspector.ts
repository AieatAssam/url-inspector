export interface Hop {
  url: string
  statusCode: number
  statusText: string
  timingMs: number
  location: string | null
  error?: string
  isFinal: boolean
}

const CORS_PROXY = 'https://corsproxy.io/?url='

// Known tracking/redirect patterns to detect
const SHORTENER_DOMAINS = [
  'bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd',
  'buff.ly', 'shorturl.at', 'tiny.cc', 'bl.ink', 'lnkd.in', 'rb.gy',
  'rebrand.ly', 'cutt.ly', 'shorte.st', 'v.gd', 'clicky.me',
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

async function followChain(url: string, useProxy: boolean, maxHops = 20): Promise<Hop[]> {
  const hops: Hop[] = []
  let currentUrl = url
  let proxyUsed = useProxy

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

      // For proxy responses, the actual status might be wrapped
      let statusCode = response.status
      let statusText = response.statusText

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
        // Retry this URL with proxy
        hops.pop()
        i--
        continue
      }

    } catch (err) {
      const endTime = performance.now()

      // If direct fetch failed and we haven't tried proxy yet
      if (!proxyUsed) {
        proxyUsed = true
        // Retry from current URL with proxy
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

  return hops
}

export interface InspectionResult {
  originalUrl: string
  cleanUrl: string | null
  hops: Hop[]
  totalRedirects: number
  totalTiming: number
  finalUrl: string
  proxyUsed: boolean
}

export async function inspectUrl(url: string): Promise<InspectionResult> {
  // Normalize URL
  let normalizedUrl = url.trim()
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl
  }

  const cleanUrl = stripTrackingParamsSimple(normalizedUrl)
  const cleanUrlStr = cleanUrl !== normalizedUrl ? cleanUrl : null

  const hops = await followChain(normalizedUrl, false)
  const proxyUsed = hops.some(h => h.error === 'CORS / Network error') || hops.length === 0

  // If direct failed, retry with proxy for the whole chain
  let finalHops = hops
  if (hops.length === 0 || (hops.length === 1 && hops[0].error)) {
    finalHops = await followChain(normalizedUrl, true)
  }

  const totalRedirects = finalHops.filter(h => !h.isFinal).length
  const totalTiming = finalHops.reduce((sum, h) => sum + h.timingMs, 0)
  const lastHop = finalHops[finalHops.length - 1]
  const finalUrl = lastHop?.url || normalizedUrl

  return {
    originalUrl: normalizedUrl,
    cleanUrl: cleanUrlStr,
    hops: finalHops,
    totalRedirects,
    totalTiming,
    finalUrl,
    proxyUsed: proxyUsed && finalHops.length > 0,
  }
}

function stripTrackingParamsSimple(url: string): string {
  const TRACKING_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
    'msclkid', 'twclid', 'igshid', 'mc_cid', 'mc_eid',
    '_ga', '_gl', '_hsenc', '_hsmi', 'hsCtaTracking',
    'ref', 'source', 'si', 's_kwcid', 'ef_id',
    'mkt_tok', 'vero_conv', 'vero_id',
  ]
  try {
    const parsed = new URL(url)
    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param)
    }
    return parsed.toString()
  } catch {
    return url
  }
}
