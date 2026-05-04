const TRACKING_PARAMS = [
  // UTM
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  // Social
  'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid',
  'msclkid', 'twclid', 'igshid', 'mc_cid', 'mc_eid',
  // Analytics
  '_ga', '_gl', '_hsenc', '_hsmi', 'hsCtaTracking',
  'yclid', 'wickedid', 'trooptid',
  // Other trackers
  'ref', 'source', 'si', 's_kwcid', 'ef_id',
  's_cid', 'mkt_tok', 'vero_conv', 'vero_id',
]

export interface TrackingParamInfo {
  param: string
  value: string
  category: string
}

function paramCategory(param: string): string {
  if (param.startsWith('utm_')) return 'UTM Marketing'
  if (['fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid', 'msclkid', 'twclid', 'igshid'].includes(param)) return 'Social / Ad'
  if (['_ga', '_gl'].includes(param)) return 'Google Analytics'
  if (['_hsenc', '_hsmi', 'hsCtaTracking'].includes(param)) return 'HubSpot'
  if (['mc_cid', 'mc_eid'].includes(param)) return 'Mailchimp'
  if (['yclid', 'wickedid', 'trooptid'].includes(param)) return 'Ad Platform'
  if (['ref', 'source', 'si', 's_kwcid', 'ef_id'].includes(param)) return 'Referral'
  return 'Other'
}

export function extractTrackingParams(url: string): TrackingParamInfo[] {
  try {
    const parsed = new URL(url)
    const found: TrackingParamInfo[] = []
    for (const param of TRACKING_PARAMS) {
      const value = parsed.searchParams.get(param)
      if (value) {
        found.push({ param, value, category: paramCategory(param) })
      }
    }
    return found
  } catch {
    return []
  }
}

export function stripTrackingParams(url: string): string {
  try {
    const parsed = new URL(url)
    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param)
    }
    // Remove empty query string
    const result = parsed.toString()
    return result
  } catch {
    return url
  }
}
