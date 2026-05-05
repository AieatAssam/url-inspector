import type { Hop } from '@/lib/urlInspector'
import { HopNode } from './HopNode'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ChevronDown, ChevronRight, Eye, EyeOff, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface RedirectChainProps {
  hops: Hop[]
  expanded: boolean
  onToggleExpanded: () => void
}

export function RedirectChain({ hops, expanded, onToggleExpanded }: RedirectChainProps) {
  const [advancedMode, setAdvancedMode] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const maxTiming = Math.max(...hops.map(h => h.timingMs), 1)

  const copyUrl = async (url: string, index: number) => {
    await navigator.clipboard.writeText(url)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  if (hops.length === 0) return null

  const visibleHops = expanded ? hops : hops.slice(-1)

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onToggleExpanded}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {expanded ? (
            <>
              <ChevronDown className="h-4 w-4" />
              <span>Redirect chain ({hops.length} {hops.length === 1 ? 'hop' : 'hops'})</span>
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4" />
              <span>
                {hops.length > 1
                  ? `${hops.length - 1} redirect${hops.length !== 2 ? 's' : ''}`
                  : hops[0]?.synthetic
                    ? 'Proxy Resolved'
                    : 'No redirects'
                }
              </span>
            </>
          )}
        </button>

        {expanded && (
          <div className="flex items-center gap-2">
            <Label htmlFor="advanced-mode" className="text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer">
              {advancedMode ? (
                <><EyeOff className="h-3 w-3" /> Advanced</>
              ) : (
                <><Eye className="h-3 w-3" /> Advanced</>
              )}
            </Label>
            <Switch
              id="advanced-mode"
              checked={advancedMode}
              onCheckedChange={setAdvancedMode}
            />
          </div>
        )}
      </div>

      {/* Hop nodes */}
      {expanded && (
        <div className="space-y-1">
          {visibleHops.map((hop, i) => (
            <div key={i} className="relative group/hop">
              <HopNode hop={hop} index={i} maxTiming={maxTiming} showAdvanced={advancedMode} />
              {advancedMode && (
                <button
                  onClick={() => copyUrl(hop.url, i)}
                  className="absolute right-2 top-2 p-1 rounded-md hover:bg-muted transition-colors opacity-0 group-hover/hop:opacity-100"
                >
                  {copiedIndex === i ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
