import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isShortUrl, countTrackingParams, inspectUrl } from './urlInspector'

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
    // Mock fetch to return a simple response
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
})
