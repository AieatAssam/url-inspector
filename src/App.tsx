import { useState, useCallback } from 'react'
import { UrlForm } from '@/components/UrlForm'
import { ResultDisplay } from '@/components/ResultDisplay'
import { inspectUrl, type InspectionResult } from '@/lib/urlInspector'
import { AlertCircle, Link2, GitBranch, MonitorSmartphone } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { TooltipProvider } from '@/components/ui/tooltip'

interface AppState {
  status: 'idle' | 'loading' | 'success' | 'error'
  result: InspectionResult | null
  error: string | null
}

function Footer() {
  return (
    <footer className="mt-auto py-6 border-t">
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <a
          href="https://github.com/AieatAssam/url-inspector"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <GitBranch className="h-3.5 w-3.5" />
          Source Code
        </a>
        <span className="text-border">|</span>
        <span>Client-side only &bull; CORS proxy fallback</span>
      </div>
    </footer>
  )
}

export default function App() {
  const [state, setState] = useState<AppState>({
    status: 'idle',
    result: null,
    error: null,
  })

  const handleInspect = useCallback(async (url: string) => {
    setState({ status: 'loading', result: null, error: null })

    try {
      const result = await inspectUrl(url)
      setState({ status: 'success', result, error: null })
    } catch (err) {
      setState({
        status: 'error',
        result: null,
        error: err instanceof Error ? err.message : 'Failed to inspect URL',
      })
    }
  }, [])

  return (
    <TooltipProvider>
      <div className="min-h-svh flex flex-col">
        <div className="flex-1 mx-auto w-full max-w-2xl px-4 py-8 sm:py-12 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10">
                <Link2 className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                URL Inspector
              </h1>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
              Uncover the full redirect chain, measure hop latency, and strip tracking parameters from any URL.
            </p>
          </div>

          {/* URL Input */}
          <UrlForm onSubmit={handleInspect} isLoading={state.status === 'loading'} />

          {/* Error */}
          {state.status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Inspection failed</AlertTitle>
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {state.status === 'success' && state.result && (
            <ResultDisplay result={state.result} />
          )}

          {/* Empty state */}
          {state.status === 'idle' && (
            <div className="text-center py-12 space-y-4">
              <div className="p-4 rounded-full bg-muted inline-flex">
                <Link2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Paste a shortened or redirect-heavy URL above
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Works with bit.ly, t.co, google.com/url, and any redirect chain
                </p>
              </div>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </TooltipProvider>
  )
}
