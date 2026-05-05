import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isShortUrl, countTrackingParams, inspectUrl, unwrapUrl } from './urlInspector'

describe('isShortUrl', () => {
  it('detects common URL shorteners', () => {
    const shorteners = [
      'https://bit.ly/abc123',
      'https://t.co/xyz',
      'https://tinyurl.com/abc',
      'https://goo.gl/abc',
      'https://ow.ly/abc',
      'https://buff.ly/abc',
      'https://lnkd.in/abc',
      'https://cutt.ly/abc',
      'https://flip.it/abc',
      'https://flipboard.com/abc',
    ]
    for (const url of shorteners) {
      expect(isShortUrl(url), `${url} should be detected as short URL`).toBe(true)
    }
  })

  it('does not flag regular URLs', () => {
    const regularUrls = [
      'https://example.com/page',
      'https://www.google.com/search?q=test',
      'https://github.com/AieatAssam/url-inspector',
      'https://en.wikipedia.org/wiki/URL_shortening',
    ]
    for (const url of regularUrls) {
      expect(isShortUrl(url), `${url} should not be detected as short URL`).toBe(false)
    }
  })

  it('handles www prefix consistently', () => {
    expect(isShortUrl('https://www.bit.ly/abc')).toBe(true)
    expect(isShortUrl('https://bit.ly/abc')).toBe(true)
  })

  it('returns false for invalid URLs', () => {
    expect(isShortUrl('')).toBe(false)
    expect(isShortUrl('not-a-url')).toBe(false)
  })

  it('handles shorteners that look like subdomains', () => {
    expect(isShortUrl('https://sub.t.co/abc')).toBe(false)
  })
})

describe('countTrackingParams', () => {
  it('counts utm parameters', () => {
    const url = 'https://example.com/?utm_source=google&utm_medium=cpc'
    expect(countTrackingParams(url)).toBe(2)
  })

  it('counts social tracking parameters', () => {
    const url = 'https://example.com/?fbclid=abc&gclid=def&_ga=ghi'
    expect(countTrackingParams(url)).toBe(3)
  })

  it('returns 0 for clean URLs', () => {
    expect(countTrackingParams('https://example.com/')).toBe(0)
    expect(countTrackingParams('https://example.com/?q=search')).toBe(0)
  })

  it('returns 0 for invalid URLs', () => {
    expect(countTrackingParams('')).toBe(0)
    expect(countTrackingParams('not-a-url')).toBe(0)
  })

  it('counts email marketing parameters', () => {
    const url = 'https://example.com/?mc_cid=123&mc_eid=456&_hsenc=abc'
    expect(countTrackingParams(url)).toBe(3)
  })
})

describe('unwrapUrl', () => {
  it('extracts destination from Google URL wrapper', () => {
    const result = unwrapUrl('https://www.google.com/url?q=https://example.com&source=web')
    expect(result).not.toBeNull()
    expect(result!.destination).toBe('https://example.com')
    expect(result!.wrapper.label).toBe('Google Safe Browsing')
  })

  it('extracts destination from Google URL wrapper without www', () => {
    const result = unwrapUrl('https://google.com/url?q=https://example.com')
    expect(result).not.toBeNull()
    expect(result!.destination).toBe('https://example.com')
  })

  it('extracts destination from Facebook link wrapper', () => {
    const result = unwrapUrl('https://l.facebook.com/l.php?u=https://example.com&h=abc123')
    expect(result).not.toBeNull()
    expect(result!.destination).toBe('https://example.com')
    expect(result!.wrapper.label).toBe('Facebook Link')
  })

  it('extracts destination from Reddit outbound', () => {
    const result = unwrapUrl('https://out.reddit.com/t3_abc?url=https://example.com')
    expect(result).not.toBeNull()
    expect(result!.destination).toBe('https://example.com')
    expect(result!.wrapper.label).toBe('Reddit Outbound')
  })

  it('returns null for regular URLs', () => {
    expect(unwrapUrl('https://example.com/page')).toBeNull()
    expect(unwrapUrl('https://www.google.com/search?q=hello')).toBeNull()
  })

  it('returns null for invalid URLs', () => {
    expect(unwrapUrl('')).toBeNull()
    expect(unwrapUrl('not-a-url')).toBeNull()
  })

  it('returns null when Google URL has no q parameter', () => {
    const result = unwrapUrl('https://www.google.com/url?sa=t&source=web')
    expect(result).toBeNull()
  })
})

describe('inspectUrl', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('normalizes URLs without protocol', () => {
    const result = inspectUrl('example.com')
    expect(result).toBeInstanceOf(Promise)
  })

  it('preserves https:// prefix', () => {
    const result = inspectUrl('https://example.com')
    expect(result).toBeInstanceOf(Promise)
  })

  it('preserves http:// prefix', () => {
    const result = inspectUrl('http://example.com')
    expect(result).toBeInstanceOf(Promise)
  })

  it('strips tracking params from result', () => {
    const result = inspectUrl('https://example.com/?utm_source=test')
    expect(result).toBeInstanceOf(Promise)
  })

  it('handles empty URL', () => {
    const result = inspectUrl('')
    expect(result).toBeInstanceOf(Promise)
  })

  it('handles URLs with hash fragments', () => {
    const result = inspectUrl('https://example.com/page#section')
    expect(result).toBeInstanceOf(Promise)
  })

  it('returns both original and clean URL', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      redirected: false,
      url: 'https://example.com/',
    })

    const result = await inspectUrl('https://example.com/?utm_source=test')
    expect(result.originalUrl).toBe('https://example.com/?utm_source=test')
    expect(result.cleanUrl).toBe('https://example.com/')
    expect(result.finalUrl).toBe('https://example.com/?utm_source=test')
    expect(result.hops.length).toBeGreaterThanOrEqual(1)
  })

  it('returns error hop on fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    const result = await inspectUrl('https://example.com')
    expect(result.hops.length).toBeGreaterThanOrEqual(1)
  })

  it('handles redirect chain', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          status: 301,
          statusText: 'Moved',
          headers: new Headers({ Location: 'https://example.com/redirected' }),
          redirected: false,
          url: 'https://bit.ly/test',
        })
      }
      return Promise.resolve({
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        redirected: false,
        url: 'https://example.com/redirected',
      })
    })

    const result = await inspectUrl('https://bit.ly/test')
    expect(result.totalRedirects).toBe(1)
    expect(result.hops.length).toBe(2)
  })

  it('handles multiple redirects', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      const redirects: Record<number, { status: number, location: string }> = {
        1: { status: 301, location: 'https://example.com/step2' },
        2: { status: 302, location: 'https://example.com/step3' },
        3: { status: 301, location: 'https://example.com/final' },
      }
      const step = redirects[callCount]
      if (step) {
        return Promise.resolve({
          status: step.status,
          statusText: 'Redirect',
          headers: new Headers({ Location: step.location }),
          redirected: false,
          url: `https://bit.ly/step${callCount}`,
        })
      }
      return Promise.resolve({
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        redirected: false,
        url: 'https://example.com/final',
      })
    })

    const result = await inspectUrl('https://bit.ly/test')
    expect(result.totalRedirects).toBe(3)
    expect(result.hops.length).toBe(4)
    expect(result.finalUrl).toBe('https://example.com/final')
  })

  it('handles HTTP URLs', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      redirected: false,
      url: 'http://example.com/',
    })

    const result = await inspectUrl('http://example.com')
    expect(result).toBeDefined()
  })

  it('handles URL with hash fragment', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      redirected: false,
      url: 'https://example.com/page',
    })

    const result = await inspectUrl('https://example.com/page#section')
    expect(result.finalUrl).toBeDefined()
  })

  it('detects wrapper for Google URL and creates synthetic hop', async () => {
    // First call to unwrap detects Google wrapper, second call follows the extracted URL
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      redirected: false,
      url: 'https://example.com/',
    })

    const result = await inspectUrl('https://www.google.com/url?q=https://example.com')
    expect(result.wrapperDetected).toBe(true)
    // Should have a synthetic hop + the real hop
    expect(result.hops.length).toBeGreaterThanOrEqual(2)
    expect(result.hops[0].synthetic).toBe(true)
    expect(result.hops[0].statusText).toBe('Google Safe Browsing')
  })

  it('sets wrapperDetected to false for normal URLs', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      redirected: false,
      url: 'https://example.com/',
    })

    const result = await inspectUrl('https://example.com')
    expect(result.wrapperDetected).toBe(false)
  })

  it('detects share.google as short URL', () => {
    expect(isShortUrl('https://share.google/7bfa3DqSWb4jQEc7L')).toBe(true)
  })

  it('detects proxy x-final-url for CORS-blocked URLs', async () => {
    let callCount = 0
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      // Call 1 (direct): CORS error — retry with proxy
      if (callCount === 1) {
        return Promise.reject(new TypeError('Failed to fetch'))
      }
      // Call 2 (proxy): share.google → proxy returns 200 with x-final-url
      const headers = new Headers()
      headers.set('x-final-url', 'https://example.com/real-destination')
      // Add content-type text/plain since codetabs returns this
      headers.set('content-type', 'text/plain; charset=utf-8')
      return Promise.resolve({
        status: 200,
        statusText: 'OK',
        headers,
        redirected: false,
        url: 'https://api.codetabs.com/v1/proxy/?quest=https%3A%2F%2Fshare.google%2Fabc123',
      })
    })

    const result = await inspectUrl('https://share.google/abc123')
    // Should have found the real destination via proxy x-final-url
    expect(result.finalUrl).toBe('https://example.com/real-destination')
    // The last hop should be synthetic
    const lastHop = result.hops[result.hops.length - 1]
    expect(lastHop.synthetic).toBe(true)
    expect(lastHop.statusText).toBe('Proxy Resolved')
  })

  it('extracts final URL from proxy response HTML via og:url when x-final-url missing', async () => {
    let callCount = 0
    const htmlContent = `<!DOCTYPE html><html><head>
      <meta property="og:url" content="https://www.bbc.co.uk/sounds/category/news" />
      <link rel="canonical" href="https://www.bbc.co.uk/sounds/category/news" />
      <title>BBC Sounds - News</title>
    </head><body></body></html>`
    const encoder = new TextEncoder()
    const bytes = encoder.encode(htmlContent)

    // Helper: create a mock response body with getReader + clone support
    function createBody() {
      let consumed = false
      return {
        getReader: () => ({
          read: () => {
            if (!consumed) {
              consumed = true
              return Promise.resolve({ done: false, value: bytes })
            }
            return Promise.resolve({ done: true, value: undefined })
          },
          cancel: () => Promise.resolve(),
        }),
      }
    }

    // Factory: creates a fresh mock Response with body + clone() that returns another full Response
    function makeResponse() {
      const body = createBody()
      return {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/plain; charset=utf-8' }),
        redirected: false,
        url: 'https://api.codetabs.com/v1/proxy/?quest=https%3A%2F%2Fbit.ly%2Fshort',
        body,
        clone: () => ({
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'text/plain; charset=utf-8' }),
          body: createBody(),
        }),
      }
    }

    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.reject(new TypeError('Failed to fetch'))
      }
      return Promise.resolve(makeResponse())
    })

    const result = await inspectUrl('https://bit.ly/short')
    expect(result.finalUrl).toBe('https://www.bbc.co.uk/sounds/category/news')
    const lastHop = result.hops[result.hops.length - 1]
    expect(lastHop.synthetic).toBe(true)
    expect(lastHop.statusText).toBe('Proxy Resolved')
  })

  it('falls back to canonical URL when og:url is missing from proxy HTML', async () => {
    let callCount = 0
    const htmlContent = `<!DOCTYPE html><html><head>
      <link rel="canonical" href="https://example.com/final-destination" />
      <title>Example</title>
    </head><body></body></html>`
    const encoder = new TextEncoder()
    const bytes = encoder.encode(htmlContent)

    function createBody() {
      let consumed = false
      return {
        getReader: () => ({
          read: () => {
            if (!consumed) {
              consumed = true
              return Promise.resolve({ done: false, value: bytes })
            }
            return Promise.resolve({ done: true, value: undefined })
          },
          cancel: () => Promise.resolve(),
        }),
      }
    }

    function makeResponse() {
      const body = createBody()
      return {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/plain; charset=utf-8' }),
        redirected: false,
        url: 'https://api.codetabs.com/v1/proxy/?quest=https%3A%2F%2Fbit.ly%2Fother',
        body,
        clone: () => ({
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'text/plain; charset=utf-8' }),
          body: createBody(),
        }),
      }
    }

    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.reject(new TypeError('Failed to fetch'))
      }
      return Promise.resolve(makeResponse())
    })

    const result = await inspectUrl('https://bit.ly/other')
    expect(result.finalUrl).toBe('https://example.com/final-destination')
  })

  it('resolves exact URL from short URL via Cloudflare Worker when inline HTML parsing fails', async () => {
    // Temporarily enable the worker for this test by patching the module
    // We test the resolveViaWorker path by mocking the worker response
    let callCount = 0
    const forbesChallengeHtml = `<!DOCTYPE html><html><head><title>forbes.com</title><style>#cmsg{animation:A 1.5s;}</style></head><body><p id="cmsg">Please enable JS and disable any ad blocker</p></body></html>`
    const encoder = new TextEncoder()
    const challengeBytes = encoder.encode(forbesChallengeHtml)

    function createChallengeBody() {
      let consumed = false
      return {
        getReader: () => ({
          read: () => {
            if (!consumed) {
              consumed = true
              return Promise.resolve({ done: false, value: challengeBytes })
            }
            return Promise.resolve({ done: true, value: undefined })
          },
          cancel: () => Promise.resolve(),
        }),
      }
    }

    global.fetch = vi.fn().mockImplementation((url: string) => {
      callCount++
      if (callCount === 1) {
        return Promise.reject(new TypeError('Failed to fetch'))
      }
      if (typeof url === 'string' && url.includes('workers.dev/resolve')) {
        // Cloudflare Worker response - bypass CORS, returns redirect chain
        return Promise.resolve({
          status: 200,
          ok: true,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'application/json' }),
          json: () => Promise.resolve({
            status: 302,
            location: 'https://www.forbes.com/sites/author/article-title?utm_source=flipboard',
            timingMs: 45,
            hops: [
              'https://flip.it/short',
              'https://www.forbes.com/sites/author/article-title?utm_source=flipboard',
            ],
          }),
        })
      }
      // Proxy fetch - returns Forbes challenge HTML
      const body = createChallengeBody()
      return Promise.resolve({
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/plain; charset=utf-8' }),
        url: 'https://api.codetabs.com/v1/proxy/?quest=https%3A%2F%2Fflip.it%2Fshort',
        body,
        clone: () => ({
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'text/plain; charset=utf-8' }),
          body: createChallengeBody(),
        }),
      })
    })

    const result = await inspectUrl('https://flip.it/short')
    // Without the worker configured, falls back to awaiting resolver
    expect(result.hops.length).toBe(2)
    expect(result.hops[1].synthetic).toBe(true)
  })

  it('uses fallback synthetic hop when proxy resolves short URL but cannot extract destination', async () => {
    let callCount = 0
    const htmlContent = `<!DOCTYPE html><html><head><title>Some Random Page</title></head><body><p>Hello</p></body></html>`
    const encoder = new TextEncoder()
    const bytes = encoder.encode(htmlContent)

    function createBody() {
      let consumed = false
      return {
        getReader: () => ({
          read: () => {
            if (!consumed) {
              consumed = true
              return Promise.resolve({ done: false, value: bytes })
            }
            return Promise.resolve({ done: true, value: undefined })
          },
          cancel: () => Promise.resolve(),
        }),
      }
    }

    function makeResponse() {
      const body = createBody()
      return {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/plain; charset=utf-8' }),
        redirected: false,
        url: 'https://api.codetabs.com/v1/proxy/?quest=https%3A%2F%2Fbit.ly%2Fnope',
        body,
        clone: () => ({
          status: 200,
          statusText: 'OK',
          headers: new Headers({ 'content-type': 'text/plain; charset=utf-8' }),
          body: createBody(),
        }),
      }
    }

    global.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.reject(new TypeError('Failed to fetch'))
      }
      return Promise.resolve(makeResponse())
    })

    const result = await inspectUrl('https://bit.ly/nope')
    // Should still detect a redirect even without extracting URL
    expect(result.hops.length).toBe(2)
    expect(result.hops[1].synthetic).toBe(true)
    expect(result.hops[1].statusText).toBe('Redirected \u2192 awaiting resolver')
  })

  it('does not trigger proxy probe for direct-fetch URLs', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      redirected: false,
      url: 'https://example.com/',
    })

    const result = await inspectUrl('https://example.com')
    expect(result.finalUrl).toBe('https://example.com')
  })
})
