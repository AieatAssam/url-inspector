import { describe, it, expect } from 'vitest'
import { formatUrl } from './formatUrl'

describe('formatUrl', () => {
  it('formats a normal URL with hostname and path', () => {
    const result = formatUrl('https://example.com/page')
    expect(result.display).toBe('example.com/page')
    expect(result.full).toBe('https://example.com/page')
  })

  it('includes query string in display', () => {
    const result = formatUrl('https://example.com/search?q=test')
    expect(result.display).toBe('example.com/search?q=test')
  })

  it('truncates long paths beyond maxLen', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(60)
    const result = formatUrl(longUrl, 30)
    expect(result.display).toContain('…')
    expect(result.display.length).toBeLessThan(longUrl.length)
  })

  it('does not truncate short paths', () => {
    const result = formatUrl('https://example.com/short')
    expect(result.display).not.toContain('…')
  })

  it('handles invalid URLs with fallback', () => {
    const result = formatUrl('not-a-valid-url')
    expect(result.display).toBe('not-a-valid-url')
    expect(result.full).toBe('not-a-valid-url')
  })

  it('truncates invalid long URLs in fallback', () => {
    const longInvalid = 'x'.repeat(100)
    const result = formatUrl(longInvalid, 20)
    expect(result.display).toContain('…')
    expect(result.display.length).toBeLessThan(100)
  })

  it('handles empty URL', () => {
    const result = formatUrl('')
    expect(result.display).toBe('')
  })

  it('handles URL with hash', () => {
    const result = formatUrl('https://example.com/page#section')
    expect(result.display).toBe('example.com/page')
    expect(result.full).toBe('https://example.com/page#section')
  })
})
