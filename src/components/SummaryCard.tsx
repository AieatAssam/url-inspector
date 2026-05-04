import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Copy, Check, ExternalLink, ShieldCheck, Shield, Route, Zap } from 'lucide-react'
import type { InspectionResult } from '@/lib/urlInspector'
import { formatUrl } from '@/lib/formatUrl'

interface SummaryCardProps {
  result: InspectionResult
}

export function SummaryCard({ result }: SummaryCardProps) {
  const [copiedFinal, setCopiedFinal] = useState(false)
  const [copiedClean, setCopiedClean] = useState(false)

  const finalInfo = formatUrl(result.finalUrl)
  const cleanInfo = result.cleanUrl ? formatUrl(result.cleanUrl) : null

  const copyUrl = async (url: string, setter: (v: boolean) => void) => {
    await navigator.clipboard.writeText(url)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

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
            <span className="text-sm font-mono truncate flex-1" title={finalInfo.full}>
              {finalInfo.display}
            </span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => copyUrl(finalInfo.full, setCopiedFinal)}
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
                    href={finalInfo.full}
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

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x">
          <div className="p-4 text-center space-y-1">
            <Badge variant={result.totalRedirects > 0 ? 'secondary' : 'outline'} className="gap-1">
              {result.totalRedirects > 0 ? (
                <Route className="h-3 w-3" />
              ) : (
                <Zap className="h-3 w-3" />
              )}
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
              {result.cleanUrl ? (
                <ShieldCheck className="h-3 w-3 text-green-500" />
              ) : (
                <Shield className="h-3 w-3" />
              )}
              {result.cleanUrl ? 'Trackers found' : 'Clean'}
            </Badge>
          </div>
        </div>

        {/* Clean URL */}
        {result.cleanUrl && (
          <div className="p-4 space-y-1.5 bg-green-500/5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wider">
                Tracking parameters stripped
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
        )}
      </CardContent>
    </Card>
  )
}
