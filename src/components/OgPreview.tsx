import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { fetchOgPreview, type OgData } from '@/lib/ogPreview'
import { ExternalLink, Globe } from 'lucide-react'

interface OgPreviewProps {
  url: string
}

type OgPreviewState =
  | { status: 'loading' }
  | { status: 'loaded'; data: OgData }
  | { status: 'error'; error: string }
  | { status: 'empty' }

function OgPreviewLoading() {
  const shimmer = 'rounded animate-shimmer'
  return (
    <Card className="overflow-hidden">
      {/* Image skeleton */}
      <div className={`aspect-[2/1] ${shimmer}`} />
      <CardContent className="p-4 space-y-3">
        {/* Domain */}
        <div className={`h-3 w-20 ${shimmer}`} />
        {/* Title */}
        <div className={`h-4 w-3/4 ${shimmer}`} />
        <div className={`h-4 w-1/2 ${shimmer}`} />
        {/* Description */}
        <div className="space-y-1.5">
          <div className={`h-3 w-full ${shimmer}`} />
          <div className={`h-3 w-5/6 ${shimmer}`} />
        </div>
      </CardContent>
    </Card>
  )
}

function NoPreviewFallback({ url }: { url: string }) {
  let hostname = url
  try {
    hostname = new URL(url).hostname
  } catch {
    // keep original
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span className="text-xs font-medium uppercase tracking-wider">No preview available</span>
        </div>
        <div className="flex items-center gap-2">
          <img
            src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=64`}
            alt=""
            className="h-5 w-5 rounded"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          <span className="text-sm font-mono truncate">{hostname}</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto p-1 rounded-md hover:bg-muted transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

export function OgPreview({ url }: OgPreviewProps) {
  const [state, setState] = useState<OgPreviewState>({ status: 'loading' })
  const mountedRef = useRef(true)
  const fetchIdRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    const currentId = ++fetchIdRef.current

    setState({ status: 'loading' })

    fetchOgPreview(url).then((data) => {
      if (!mountedRef.current || currentId !== fetchIdRef.current) return

      if (!data) {
        setState({ status: 'empty' })
        return
      }

      if (!data.title && !data.description && !data.image && !data.favicon) {
        // No useful OG data at all — show fallback
        setState({ status: 'empty' })
        return
      }

      setState({ status: 'loaded', data })
    }).catch(() => {
      if (mountedRef.current && currentId === fetchIdRef.current) {
        setState({ status: 'empty' })
      }
    })

    return () => {
      mountedRef.current = false
    }
  }, [url])

  if (state.status === 'loading') {
    return <OgPreviewLoading />
  }

  if (state.status === 'empty' || state.status === 'error') {
    return <NoPreviewFallback url={url} />
  }

  const { data } = state

  const hasImage = !!data.image
  const title = data.title || data.siteName || new URL(data.url).hostname
  const description = data.description
  const domain = data.siteName || (() => {
    try { return new URL(data.url).hostname } catch { return data.url }
  })()

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <Card className="overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/30 group-hover:bg-accent/5 animate-scale-in">
        {/* Image */}
        {hasImage && (
          <div className="relative aspect-[2/1] bg-muted overflow-hidden">
            <img
              src={data.image!}
              alt={title || ''}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            {/* Gradient overlay at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />

            {/* Domain badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm">
              <img
                src={data.favicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                alt=""
                className="h-3.5 w-3.5 rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <span className="text-[11px] text-white/90 font-medium">{domain}</span>
            </div>
          </div>
        )}

        <CardContent className={cn('p-4 space-y-2', hasImage ? '' : 'pt-4')}>
          {/* Domain row (when no image) */}
          {!hasImage && (
            <div className="flex items-center gap-2">
              <img
                src={data.favicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                alt=""
                className="h-4 w-4 rounded"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <span className="text-xs text-muted-foreground truncate">{domain}</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground/60 ml-auto flex-shrink-0" />
            </div>
          )}

          {/* Title */}
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {description}
            </p>
          )}

          {/* Theme color indicator */}
          {data.themeColor && (
            <div className="flex items-center gap-1.5 pt-1">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: data.themeColor }}
              />
              <span className="text-[10px] text-muted-foreground/50 font-mono uppercase">
                {data.themeColor}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </a>
  )
}
