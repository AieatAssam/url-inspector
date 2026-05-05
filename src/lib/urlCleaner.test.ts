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

describe('stripTrackingParams (new params)', () => {
  it('strips Google Ads parameters', () => {
    const url = 'https://example.com/?gad_source=search&gad_campaign=spring&gad=1'
    const result = stripTrackingParams(url)
    expect(result).toBe('https://example.com/')
  })

  it('strips Amazon affiliate parameters', () => {
    const url = 'https://www.amazon.co.uk/dp/B0D4B1ZHZV?tag=youraffiliate-21&linkCode=ll1&linkId=abc123'
    const result = stripTrackingParams(url)
    expect(result).toBe('https://www.amazon.co.uk/dp/B0D4B1ZHZV')
  })

  it('strips Matomo/Piwik analytics parameters', () => {
    const url = 'https://example.com/?mtm_source=newsletter&mtm_campaign=spring&pk_source=email&pk_campaign=sale'
    const result = stripTrackingParams(url)
    expect(result).toBe('https://example.com/')
  })

  it('strips Pinterest parameters', () => {
    const url = 'https://example.com/?epik=123abc'
    const result = stripTrackingParams(url)
    expect(result).toBe('https://example.com/')
  })

  it('strips ad platform parameters that werent previously covered', () => {
    const url = 'https://example.com/?yclid=abc&wickedid=def&trooptid=ghi'
    const result = stripTrackingParams(url)
    expect(result).toBe('https://example.com/')
  })

  it('strips the catch-all other tracking parameters', () => {
    const url = 'https://example.com/?s_cid=abc&mkt_tok=def&vero_conv=ghi&vero_id=jkl'
    const result = stripTrackingParams(url)
    expect(result).toBe('https://example.com/')
  })

  it('strips mixed old and new params together', () => {
    const url = 'https://example.com/?utm_source=google&tag=affiliate&gad_source=search&epik=pinterest'
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

  it('extracts Google Ads params with correct category', () => {
    const result = extractTrackingParams('https://example.com/?gad_source=search&gad_campaign=spring')
    expect(result).toHaveLength(2)
    expect(result[0].category).toBe('Google Ads')
    expect(result[1].category).toBe('Google Ads')
  })

  it('extracts Affiliate params with correct category', () => {
    const result = extractTrackingParams('https://example.com/?tag=affiliate-21&linkCode=ll1')
    expect(result).toHaveLength(2)
    expect(result[0].category).toBe('Affiliate')
    expect(result[1].category).toBe('Affiliate')
  })

  it('extracts Matomo/Piwik params with correct category', () => {
    const result = extractTrackingParams('https://example.com/?mtm_source=newsletter&pk_campaign=sale')
    expect(result).toHaveLength(2)
    expect(result[0].category).toBe('Matomo Analytics')
    expect(result[1].category).toBe('Matomo Analytics')
  })

  it('extracts Pinterest epik with correct category', () => {
    const result = extractTrackingParams('https://example.com/?epik=abc123')
    expect(result).toHaveLength(1)
    expect(result[0].category).toBe('Pinterest')
  })

  it('categorizes unknown tracking params as Other', () => {
    const result = extractTrackingParams('https://example.com/?s_cid=abc&mkt_tok=def')
    expect(result).toHaveLength(2)
    expect(result[0].category).toBe('Other')
    expect(result[1].category).toBe('Other')
  })

  it('extracts Guardian CMP tracking params with correct category', () => {
    const result = extractTrackingParams('https://www.theguardian.com/article?CMP=share_btn_tw&cmp=editorial')
    expect(result).toHaveLength(2)
    expect(result[0].category).toBe('Campaign Tracking')
    expect(result[1].category).toBe('Campaign Tracking')
  })

  it('strips Guardian CMP tracking params', () => {
    const result = stripTrackingParams('https://www.theguardian.com/article?CMP=share_btn_tw')
    expect(result).toBe('https://www.theguardian.com/article')
  })
})
