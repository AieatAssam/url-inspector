export interface FormattedUrl {
  display: string
  full: string
}

export function formatUrl(url: string, maxLen = 50): FormattedUrl {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname + parsed.search
    const display = path.length > maxLen
      ? path.substring(0, maxLen - 3) + '…'
      : path
    return { display: parsed.hostname + display, full: url }
  } catch {
    return { display: url.length > maxLen ? url.substring(0, maxLen - 3) + '…' : url, full: url }
  }
}
