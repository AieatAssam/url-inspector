import type { Hop } from '@/lib/urlInspector'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ArrowDown,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  XCircle,
  Clock,
  ScanSearch,
  Info,
  List,
} from 'lucide-react'

interface HopNodeProps {
  hop: Hop
  index: number
  maxTiming: number
  showAdvanced: boolean
}

function getStatusBadge(statusCode: number, synthetic?: boolean) {
  if (synthetic) {
    return { variant: 'outline' as const, icon: ScanSearch }
  }
  if (statusCode >= 200 && statusCode < 300) {
    return { variant: 'default' as const, icon: CheckCircle2 }
  }
  if (statusCode >= 300 && statusCode < 400) {
    return { variant: 'secondary' as const, icon: ArrowDown }
  }
  if (statusCode >= 400 && statusCode < 500) {
    return { variant: 'destructive' as const, icon: XCircle }
  }
  if (statusCode >= 500) {
    return { variant: 'destructive' as const, icon: AlertTriangle }
  }
  return { variant: 'outline' as const, icon: AlertTriangle }
}

function badgeLabel(hop: Hop): string {
  if (hop.synthetic) return hop.statusText || 'Wrap'
  return String(hop.statusCode)
}

export function HopNode({ hop, index, maxTiming, showAdvanced }: HopNodeProps) {
  const statusInfo = getStatusBadge(hop.statusCode, hop.synthetic)
  const StatusIcon = statusInfo.icon
  const timingPercent = maxTiming > 0 ? (hop.timingMs / maxTiming) * 100 : 0

  const displayUrl = showAdvanced
    ? hop.url
    : hop.url.length > 60
      ? hop.url.substring(0, 60) + '…'
      : hop.url

  const headers = hop.headers ? Object.entries(hop.headers) : []

  return (
    <div className="group relative">
      {/* Connection line */}
      {index > 0 && (
        <div className="absolute -top-4 left-6 w-0.5 h-4 bg-border" />
      )}

      <div className="rounded-lg border bg-card hover:bg-accent/5 transition-colors overflow-hidden">
        {/* Main row */}
        <div className="flex items-start gap-3 p-3">
          {/* Status badge */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex-shrink-0 mt-0.5">
                <Badge variant={statusInfo.variant} className="gap-1 font-mono text-xs">
                  <StatusIcon className="h-3 w-3" />
                  {badgeLabel(hop)}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-64">
              <p className="font-mono text-xs leading-relaxed">
                {hop.statusMeaning || `${hop.statusCode} ${hop.statusText || (hop.isFinal ? 'OK' : 'Redirect')}`}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* URL & timing */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* URL */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono truncate" title={hop.url}>
                {displayUrl}
              </span>
              <a
                href={hop.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Timing bar */}
            {hop.timingMs > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(timingPercent, 5)}%`,
                      backgroundColor:
                        hop.timingMs > 1000 ? '#ef4444' :
                        hop.timingMs > 500 ? '#f59e0b' :
                        '#22c55e',
                    }}
                  />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground font-mono flex-shrink-0 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {hop.timingMs}ms
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">
                      {hop.timingMs >= 1000
                        ? `${(hop.timingMs / 1000).toFixed(1)}s`
                        : `${hop.timingMs}ms`} latency
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}

            {/* Error message */}
            {hop.error && (
              <p className="text-xs text-destructive">{hop.error}</p>
            )}

            {/* Location (redirect target) */}
            {showAdvanced && hop.location && !hop.isFinal && (
              <p className="text-xs text-muted-foreground truncate">
                <span className="font-medium">→ </span>{hop.location}
              </p>
            )}
          </div>
        </div>

        {/* Advanced: response headers */}
        {showAdvanced && (headers.length > 0 || hop.statusMeaning) && (
          <div className="border-t bg-muted/30 px-3 py-2 space-y-1.5">
            {hop.statusMeaning && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>{hop.statusMeaning}</span>
              </div>
            )}
            {headers.length > 0 && (
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/70">
                  <List className="h-3 w-3" />
                  Response Headers
                </div>
                <div className="pl-5 space-y-0.5">
                  {headers.map(([key, val]) => (
                    <div key={key} className="text-xs font-mono text-muted-foreground/80 truncate">
                      <span className="text-foreground/60">{key}: </span>
                      <span className="text-foreground/80">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
