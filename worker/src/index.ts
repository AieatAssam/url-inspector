/**
 * Redirect Resolver — Cloudflare Worker
 *
 * Resolves URL redirect chains server-side (bypassing browser CORS).
 * Returns the redirect status, Location header, and timing as JSON with CORS headers.
 *
 * Deploy: npx wrangler deploy
 * Usage:  GET /resolve?url=https://flip.it/abc123
 *
 * Response:
 *   { status: 302, location: "https://...", timingMs: 123, hops: ["https://..."] }
 */

interface Env {
  // No bindings needed
}

interface ResolveResult {
  status: number
  statusText: string
  location: string | null
  timingMs: number
  hops: string[]
  error?: string
}

export default {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const url = new URL(request.url)
    const targetUrl = url.searchParams.get('url')

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing "url" query parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate URL
    let normalizedUrl: string
    try {
      normalizedUrl = targetUrl.trim()
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl
      }
      new URL(normalizedUrl) // validate
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Follow the redirect chain
    let currentUrl = normalizedUrl
    const hops: string[] = [currentUrl]
    const startTime = Date.now()
    let result: ResolveResult

    try {
      for (let i = 0; i < 20; i++) {
        const resp = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          headers: {
            'User-Agent': 'URL-Inspector/1.0 (+https://github.com/AieatAssam/url-inspector)',
          },
        })

        const location = resp.headers.get('location')

        if (resp.status >= 300 && resp.status < 400 && location) {
          // Redirect
          try {
            currentUrl = new URL(location, currentUrl).href
          } catch {
            // Invalid location, stop
            currentUrl = location
          }
          hops.push(currentUrl)
        } else {
          // Not a redirect — final hop
          const timingMs = Date.now() - startTime
          result = {
            status: resp.status,
            statusText: resp.statusText,
            location,
            timingMs,
            hops,
          }
          break
        }
      }
    } catch (err) {
      result = {
        status: 0,
        statusText: 'Error',
        location: null,
        timingMs: Date.now() - startTime,
        hops,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }

    if (!result!) {
      result = {
        status: 0,
        statusText: 'Too many redirects',
        location: null,
        timingMs: Date.now() - startTime,
        hops,
        error: 'Exceeded maximum redirect count (20)',
      }
    }

    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  },
}
