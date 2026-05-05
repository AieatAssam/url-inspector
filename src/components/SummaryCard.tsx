import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Copy, Check, ExternalLink, ShieldCheck, Shield, Route, Zap,
  ChevronDown, ChevronRight, List,
} from 'lucide-react'
import type { InspectionResult } from '@/lib/urlInspector'
import { formatUrl } from '@/lib/formatUrl'
import { extractTrackingParams, type TrackingParamInfo } from '@/lib/urlCleaner'

interface SummaryCardProps {
  result: InspectionResult
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {}
  for (const item of items) {
    const key = keyFn(item)
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }
  return groups
}

export function SummaryCard({ result }: SummaryCardProps) {
  const [copiedFinal, setCopiedFinal] = useState(false)
  const [copiedClean, setCopiedClean] = useState(false)
  const [showTrackingDetails, setShowTrackingDetails] = useState(false)

  const cleanInfo = result.cleanUrl ? formatUrl(result.cleanUrl) : null

  // Detect proxy-resolved chain for better display
  const hops = result.hops
  const proxyResolvedUrl = hops.length === 2 && hops[0].synthetic === false && hops[1].synthetic === true
    ? hops[1].url
    : null
  const displayFinal = proxyResolvedUrl || result.finalUrl
  const finalInfo = formatUrl(displayFinal)

  const trackingParams = result.cleanUrl ? extractTrackingParams(result.originalUrl) : []
  const trackingByCategory = groupBy(trackingParams, t => t.category)

  const copyUrl = async (url: string, setter: (v: boolean) => void) => {
    await navigator.clipboard.writeText(url)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  const resolverRemaining = result.resolverRemaining

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0 divide-y">
        {/* Final destination */}
        <div className="p-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Final Destination
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono truncate flex-1" title={displayFinal}>
              {finalInfo.display}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => copyUrl(displayFinal, setCopiedFinal)}
                    className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
                  >
                    {copiedFinal ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Copy URL</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={displayFinal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="top">Open in new tab</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Stats badges */}
        <div className="grid grid-cols-4 divide-x">
          <div className="p-4 text-center space-y-1">
            <Badge variant={result.totalRedirects > 0 ? 'secondary' : 'outline'} className="gap-1">
              {result.totalRedirects > 0 ? <Route className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
              {result.totalRedirects > 0
                ? `${result.totalRedirects} redirect${result.totalRedirects !== 1 ? 's' : ''}`
                : 'Direct'}
            </Badge>
          </div>
          <div className="p-4 text-center space-y-1">
            <Badge variant={result.totalTiming > 500 ? 'secondary' : 'outline'} className="gap-1">
              <Zap className="h-3 w-3" />
              {result.totalTiming}ms
            </Badge>
          </div>
          <div className="p-4 text-center space-y-1">
            <Badge variant={result.cleanUrl ? 'secondary' : 'outline'} className="gap-1">
              {result.cleanUrl ? <ShieldCheck className="h-3 w-3 text-green-500" /> : <Shield className="h-3 w-3" />}
              {result.cleanUrl ? `${trackingParams.length} trackers` : 'Clean'}
            </Badge>
          </div>
          <div className="p-4 text-center space-y-1">
            <Badge variant={result.resolverUsed ? 'secondary' : 'outline'} className="gap-1">
              <ExternalLink className="h-3 w-3" />
              {result.resolverUsed
                ? resolverRemaining !== null && resolverRemaining !== undefined
                  ? `${resolverRemaining} left`
                  : 'Resolved'
                : 'No resolver'}
            </Badge>
          </div>
        </div>

        {/* Tracking params section (when trackers were found) */}
        {trackingParams.length > 0 && (
          <div className="divide-y">
            {/* Clean URL */}
            <div className="p-4 space-y-1.5 bg-green-500/5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">
                  Clean URL
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono truncate flex-1" title={cleanInfo!.full}>
                  {cleanInfo!.display}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => copyUrl(cleanInfo!.full, setCopiedClean)}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
                    >
                      {copiedClean ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Copy clean URL</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Tracking params breakdown */}
            <div>
              <button
                onClick={() => setShowTrackingDetails(!showTrackingDetails)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <List className="h-3.5 w-3.5" />
                  Stripped {trackingParams.length} tracking parameter{trackingParams.length !== 1 ? 's' : ''}
                </span>
                {showTrackingDetails ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
              {showTrackingDetails && (
                <div className="px-4 pb-3 space-y-2">
                  {Object.entries(trackingByCategory).map(([category, params]) => (
                    <div key={category}>
                      <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-1">
                        {category}
                      </p>
                      <div className="space-y-0.5">
                        {params.map((p: TrackingParamInfo) => (
                          <div key={p.param} className="flex items-center gap-2 text-xs font-mono">
                            <span className="text-foreground/60">{p.param}</span>
                            <span className="text-muted-foreground/40">=</span>
                            <span className="text-muted-foreground/70 truncate max-w-[200px]" title={p.value}>
                              {p.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
