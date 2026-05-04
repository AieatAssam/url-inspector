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
} from 'lucide-react'

interface HopNodeProps {
  hop: Hop
  index: number
  maxTiming: number
  showAdvanced: boolean
}

function getStatusBadge(statusCode: number) {
  if (statusCode >= 200 && statusCode < 300) {
    return { variant: 'default' as const, label: statusCode, icon: CheckCircle2 }
  }
  if (statusCode >= 300 && statusCode < 400) {
    return { variant: 'secondary' as const, label: statusCode, icon: ArrowDown }
  }
  if (statusCode >= 400 && statusCode < 500) {
    return { variant: 'destructive' as const, label: statusCode, icon: XCircle }
  }
  if (statusCode >= 500) {
    return { variant: 'destructive' as const, label: statusCode, icon: AlertTriangle }
  }
  return { variant: 'outline' as const, label: statusCode || '?', icon: AlertTriangle }
}

export function HopNode({ hop, index, maxTiming, showAdvanced }: HopNodeProps) {
  const statusInfo = getStatusBadge(hop.statusCode)
  const StatusIcon = statusInfo.icon
  const timingPercent = maxTiming > 0 ? (hop.timingMs / maxTiming) * 100 : 0

  const displayUrl = showAdvanced
    ? hop.url
    : hop.url.length > 60
      ? hop.url.substring(0, 60) + '…'
      : hop.url

  return (
    <div className="group relative">
      {/* Connection line */}
      {index > 0 && (
        <div className="absolute -top-4 left-6 w-0.5 h-4 bg-border" />
      )}

      <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
        {/* Status badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex-shrink-0 mt-0.5">
              <Badge variant={statusInfo.variant} className="gap-1 font-mono text-xs">
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="font-mono text-xs">
              {hop.statusCode} {hop.statusText || (hop.isFinal ? 'OK' : 'Redirect')}
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

          {/* Advanced details */}
          {showAdvanced && hop.location && !hop.isFinal && (
            <p className="text-xs text-muted-foreground truncate">
              → {hop.location}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
