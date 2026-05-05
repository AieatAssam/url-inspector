/**
 * Open Graph / Twitter Card preview data fetcher.
 * Fetches HTML via the CORS proxy, parses only the <head> section,
 * and extracts meta tags for preview cards.
 */

const CORS_PROXY = 'https://api.codetabs.com/v1/proxy/?quest='
const FETCH_TIMEOUT = 8000
const MAX_RESPONSE_BYTES = 200_000 // 200KB should be enough for <head>

export interface OgData {
  /** The final resolved URL that was fetched */
  url: string
  /** Page title (og:title, twitter:title, or <title>) */
  title: string | null
  /** Page description (og:description, twitter:description, or meta description) */
  description: string | null
  /** Preview image URL (og:image, twitter:image) */
  image: string | null
  /** Site / domain name (og:site_name) */
  siteName: string | null
  /** Favicon URL */
  favicon: string | null
  /** Twitter card type */
  twitterCard: string | null
  /** Theme colour from meta tag */
  themeColor: string | null
}

/**
 * Minimal HTML head parser state machine.
 * Extracts meta tags, title, and link[rel=icon] from <head> only.
 */
function parseHead(html: string, baseUrl: string): {
  title: string | null
  ogTags: Record<string, string>
  twitterTags: Record<string, string>
  favicon: string | null
  themeColor: string | null
  metaDescription: string | null
} {
  const result = {
    title: null as string | null,
    ogTags: {} as Record<string, string>,
    twitterTags: {} as Record<string, string>,
    favicon: null as string | null,
    themeColor: null as string | null,
    metaDescription: null as string | null,
  }

  // Extract <title> content
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (titleMatch) {
    result.title = decodeHtmlEntities(titleMatch[1].trim())
  }

  // Extract all <meta> tags (basic regex — fine for our constrained use case)
  const metaRegex = /<meta[\s\S]*?(?:\/?>|<\/meta>)/gi
  let metaMatch: RegExpExecArray | null
  while ((metaMatch = metaRegex.exec(html)) !== null) {
    const tag = metaMatch[0]
    const name = extractAttr(tag, 'name')
    const property = extractAttr(tag, 'property')
    const content = extractAttr(tag, 'content')

    if (!content) continue

    const decodedContent = decodeHtmlEntities(content)

    if (name?.toLowerCase() === 'description' && !result.metaDescription) {
      result.metaDescription = decodedContent
    }
    if (name?.toLowerCase() === 'theme-color') {
      result.themeColor = decodedContent
    }
    if (property?.startsWith('og:')) {
      result.ogTags[property.slice(3).toLowerCase()] = decodedContent
    }
    if (name?.startsWith('twitter:')) {
      result.twitterTags[name.slice(8).toLowerCase()] = decodedContent
    }
  }

  // Extract favicon from <link> tags
  const linkRegex = /<link[\s\S]*?(?:\/?>|<\/link>)/gi
  let linkMatch: RegExpExecArray | null
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const tag = linkMatch[0]
    const rel = extractAttr(tag, 'rel')?.toLowerCase()
    const href = extractAttr(tag, 'href')

    if (href && (rel === 'icon' || rel === 'shortcut icon' || rel === 'apple-touch-icon')) {
      if (!result.favicon) {
        try {
          result.favicon = new URL(href, baseUrl).href
        } catch {
          // Invalid URL, skip
        }
      }
      // Prefer apple-touch-icon if available (higher res)
      if (rel === 'apple-touch-icon') {
        try {
          result.favicon = new URL(href, baseUrl).href
        } catch {
          // skip
        }
      }
    }
  }

  return result
}

function extractAttr(tag: string, name: string): string | null {
  const regex = new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i')
  const match = tag.match(regex)
  if (match) return match[1]

  // Try single-quote
  const sqRegex = new RegExp(`\\s${name}\\s*=\\s*'([^']*)'`, 'i')
  const sqMatch = tag.match(sqRegex)
  if (sqMatch) return sqMatch[1]

  // Try unquoted
  const uqRegex = new RegExp(`\\s${name}\\s*=\\s*([^\\s>]*)`, 'i')
  const uqMatch = tag.match(uqRegex)
  if (uqMatch) return uqMatch[1]

  return null
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)))
}

/**
 * Fetch the <head> contents of a URL via CORS proxy.
 * Uses range/partial response to limit bandwidth.
 */
async function fetchHeadSection(url: string, signal: AbortSignal): Promise<string> {
  const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`

  const response = await fetch(proxyUrl, {
    signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      Range: `bytes=0-${MAX_RESPONSE_BYTES}`,
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const text = await response.text()

  // Try to limit to <head> section only
  const headEnd = text.indexOf('</head>')
  if (headEnd !== -1) {
    return text.substring(0, headEnd + '</head>'.length)
  }

  // No </head> found — return truncated text
  return text.substring(0, MAX_RESPONSE_BYTES)
}

/**
 * Attempt to fetch OG preview data for a given URL.
 * Returns null if the fetch fails or no data is available.
 */
export async function fetchOgPreview(url: string): Promise<OgData | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    let html: string
    try {
      html = await fetchHeadSection(url, controller.signal)
    } finally {
      clearTimeout(timeoutId)
    }

    const baseUrl = new URL(url).origin
    const parsed = parseHead(html, baseUrl)

    // Determine effective favicon
    let favicon = parsed.favicon
    if (!favicon) {
      // Fallback to /favicon.ico
      favicon = `${baseUrl}/favicon.ico`
    }

    // Build OG data: prefer og:title, fallback to twitter:title, fallback to <title>
    const title = parsed.ogTags.title || parsed.twitterTags.title || parsed.title
    const description = parsed.ogTags.description || parsed.twitterTags.description || parsed.metaDescription
    const image = parsed.ogTags.image || parsed.twitterTags.image || null
    const siteName = parsed.ogTags.site_name || null
    const twitterCard = parsed.twitterTags.card || null
    const themeColor = parsed.themeColor

    // Resolve relative image URLs
    let resolvedImage: string | null = null
    if (image) {
      try {
        resolvedImage = new URL(image, url).href
      } catch {
        resolvedImage = null
      }
    }

    return {
      url,
      title,
      description,
      image: resolvedImage,
      siteName,
      favicon,
      twitterCard,
      themeColor,
    }
  } catch (err) {
    // AbortError, network error, parse error — gracefully return null
    if (err instanceof DOMException && err.name === 'AbortError') {
      return null
    }
    return null
  }
}
