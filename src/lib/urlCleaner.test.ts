import { describe, it, expect } from 'vitest'
import { stripTrackingParams, extractTrackingParams } from './urlCleaner'

describe('stripTrackingParams', () => {
  it('strips utm_* parameters', () => {
    const url = 'https://example.com/page?utm_source=google&utm_medium=cpc&id=123'
    const result = stripTrackingParams(url)
    expect(result).toBe('https://example.com/page?id=123')
  })

  it('strips social tracking parameters', () => {
    const cases = [
      ['fbclid', 'https://example.com/?fbclid=abc123'],
      ['gclid', 'https://example.com/?gclid=abc123'],
      ['msclkid', 'https://example.com/?msclkid=abc123'],
      ['twclid', 'https://example.com/?twclid=abc123'],
      ['igshid', 'https://example.com/?igshid=abc123'],
    ]
    for (const [param, url] of cases) {
      const result = stripTrackingParams(url)
      expect(result, `${param} should be stripped`).toBe('https://example.com/')
    }
  })

  it('strips google analytics parameters', () => {
    const url = 'https://example.com/?_ga=2.12345&_gl=1.abc'
    const result = stripTrackingParams(url)
    expect(result).toBe('https://example.com/')
  })

  it('strips email marketing parameters', () => {
    const url = 'https://example.com/?mc_cid=123&mc_eid=456&_hsenc=xyz&_hsmi=789'
    const result = stripTrackingParams(url)
    expect(result).toBe('https://example.com/')
  })

  it('preserves non-tracking parameters', () => {
    const url = 'https://example.com/?q=search&page=2&lang=en'
    const result = stripTrackingParams(url)
    expect(result).toBe('https://example.com/?q=search&page=2&lang=en')
  })

  it('handles URLs with no parameters', () => {
    const url = 'https://example.com/page'
    const result = stripTrackingParams(url)
    expect(result).toBe('https://example.com/page')
  })

  it('handles URLs with hash fragments', () => {
    const url = 'https://example.com/page#section?utm_source=test'
    const result = stripTrackingParams(url)
    expect(result).toBe('https://example.com/page#section?utm_source=test')
  })

  it('returns original URL on parse failure', () => {
    const url = 'not-a-url'
    const result = stripTrackingParams(url)
    expect(result).toBe('not-a-url')
  })

  it('handles empty string', () => {
    const result = stripTrackingParams('')
    expect(result).toBe('')
  })

  it('removes query string entirely when only tracking params remain', () => {
    const url = 'https://example.com/?utm_source=test&utm_campaign=foo'
    const result = stripTrackingParams(url)
    expect(result).toBe('https://example.com/')
  })

  it('strips all common tracking params in one URL', () => {
    const url = 'https://example.com/' +
      '?utm_source=google' +
      '&utm_medium=cpc' +
      '&utm_campaign=spring' +
      '&utm_term=shoes' +
      '&utm_content=text' +
      '&fbclid=abc' +
      '&gclid=def' +
      '&_ga=ghi' +
      '&ref=direct'
    const result = stripTrackingParams(url)
    expect(result).toBe('https://example.com/')
  })
})

describe('extractTrackingParams', () => {
  it('extracts UTM params with correct categories', () => {
    const result = extractTrackingParams('https://example.com/?utm_source=google&utm_campaign=spring')
    expect(result).toHaveLength(2)
    expect(result[0].category).toBe('UTM Marketing')
    expect(result[0].param).toBe('utm_source')
    expect(result[0].value).toBe('google')
  })

  it('extracts social tracking params', () => {
    const result = extractTrackingParams('https://example.com/?fbclid=abc123&gclid=def456')
    expect(result).toHaveLength(2)
    expect(result[0].category).toBe('Social / Ad')
    expect(result[0].value).toBe('abc123')
  })

  it('extracts analytics params', () => {
    const result = extractTrackingParams('https://example.com/?_ga=GA1.2.abc&_gl=1.xyz')
    expect(result).toHaveLength(2)
    expect(result[0].category).toBe('Google Analytics')
  })

  it('extracts HubSpot params', () => {
    const result = extractTrackingParams('https://example.com/?_hsenc=abc&hsCtaTracking=def')
    expect(result).toHaveLength(2)
    expect(result[0].category).toBe('HubSpot')
  })

  it('returns empty array for clean URLs', () => {
    const result = extractTrackingParams('https://example.com/')
    expect(result).toHaveLength(0)
  })

  it('returns empty array for invalid URLs', () => {
    const result = extractTrackingParams('not-a-url')
    expect(result).toHaveLength(0)
  })

  it('extracts Mailchimp params', () => {
    const result = extractTrackingParams('https://example.com/?mc_cid=123&mc_eid=456')
    expect(result).toHaveLength(2)
    expect(result[0].category).toBe('Mailchimp')
  })

  it('extracts referral params', () => {
    const result = extractTrackingParams('https://example.com/?ref=direct&source=newsletter')
    expect(result).toHaveLength(2)
    expect(result[0].category).toBe('Referral')
  })
})
