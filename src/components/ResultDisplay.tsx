import { useState } from 'react'
import type { InspectionResult } from '@/lib/urlInspector'
import { SummaryCard } from './SummaryCard'
import { RedirectChain } from './RedirectChain'

interface ResultDisplayProps {
  result: InspectionResult
}

export function ResultDisplay({ result }: ResultDisplayProps) {
  const [chainExpanded, setChainExpanded] = useState(false)

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <SummaryCard result={result} />
      <RedirectChain
        hops={result.hops}
        expanded={chainExpanded}
        onToggleExpanded={() => setChainExpanded(!chainExpanded)}
      />
    </div>
  )
}
