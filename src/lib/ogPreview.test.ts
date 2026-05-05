import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchOgPreview } from './ogPreview'

describe('fetchOgPreview', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('extracts OG data from HTML with full meta tags', async () => {
    const html = `<html><head>
      <title>My Page</title>
      <meta property="og:title" content="OG Title" />
      <meta property="og:description" content="OG Description" />
      <meta property="og:image" content="https://example.com/image.jpg" />
      <meta property="og:site_name" content="Example Site" />
      <meta name="twitter:card" content="summary_large_image" />
      <link rel="icon" href="/favicon.ico" />
    </head><body></body></html>`

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(html),
    })

    const result = await fetchOgPreview('https://example.com/page')
    expect(result).not.toBeNull()
    expect(result!.title).toBe('OG Title')
    expect(result!.description).toBe('OG Description')
    expect(result!.image).toBe('https://example.com/image.jpg')
    expect(result!.siteName).toBe('Example Site')
    expect(result!.twitterCard).toBe('summary_large_image')
    expect(result!.favicon).toBe('https://example.com/favicon.ico')
  })

  it('falls back to twitter:title and <title> when og:title is missing', async () => {
    const html = `<html><head>
      <title>Page Title</title>
      <meta property="og:description" content="OG Desc" />
      <meta name="twitter:title" content="Twitter Title" />
      <link rel="icon" href="/favicon.ico" />
    </head></html>`

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(html),
    })

    const result = await fetchOgPreview('https://example.com')
    // Prefers twitter:title over <title>
    expect(result!.title).toBe('Twitter Title')
  })

  it('falls back to <title> when both og:title and twitter:title are missing', async () => {
    const html = `<html><head>
      <title>Page Title</title>
      <meta name="description" content="Meta Description" />
    </head></html>`

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(html),
    })

    const result = await fetchOgPreview('https://example.com')
    expect(result!.title).toBe('Page Title')
    expect(result!.description).toBe('Meta Description')
  })

  it('returns null when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await fetchOgPreview('https://example.com')
    expect(result).toBeNull()
  })

  it('returns null when HTTP status is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    })

    const result = await fetchOgPreview('https://example.com')
    expect(result).toBeNull()
  })

  it('returns the favicon fallback when no <link rel=icon> exists', async () => {
    const html = `<html><head>
      <title>No Icon</title>
    </head></html>`

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(html),
    })

    const result = await fetchOgPreview('https://example.com/page')
    expect(result!.favicon).toBe('https://example.com/favicon.ico')
  })

  it('handles truncated HTML without closing </head>', async () => {
    const html = `<html><head>
      <title>Truncated Page</title>
      <meta property="og:title" content="Truncated Title" />
    `

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(html),
    })

    const result = await fetchOgPreview('https://example.com')
    expect(result!.title).toBe('Truncated Title')
  })

  it('returns null for AbortError (timeout)', async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      const error = new DOMException('The operation was aborted', 'AbortError')
      throw error
    })

    const result = await fetchOgPreview('https://example.com')
    expect(result).toBeNull()
  })

  it('resolves relative og:image URLs', async () => {
    const html = `<html><head>
      <title>Img</title>
      <meta property="og:image" content="/path/to/image.jpg" />
    </head></html>`

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(html),
    })

    const result = await fetchOgPreview('https://example.com/blog/post')
    expect(result!.image).toBe('https://example.com/path/to/image.jpg')
  })

  it('prefers apple-touch-icon as favicon', async () => {
    const html = `<html><head>
      <link rel="icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    </head></html>`

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(html),
    })

    const result = await fetchOgPreview('https://example.com')
    expect(result!.favicon).toBe('https://example.com/apple-touch-icon.png')
  })

  it('handles single-quoted and unquoted attributes', async () => {
    const html = `<html><head>
      <title>Page</title>
      <meta name=description content='Page description' />
      <meta property='og:title' content=UnquotedTitle />
    </head></html>`

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(html),
    })

    const result = await fetchOgPreview('https://example.com')
    expect(result!.title).toBe('UnquotedTitle')
    expect(result!.description).toBe('Page description')
  })

  it('decodes HTML entities in title', async () => {
    const html = `<html><head>
      <title>Foo &amp; Bar &lt; Test &gt;</title>
      <meta property="og:title" content="OG &amp; Title" />
    </head></html>`

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(html),
    })

    const result = await fetchOgPreview('https://example.com')
    expect(result!.title).toBe('OG & Title')
  })
})
