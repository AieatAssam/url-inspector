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
