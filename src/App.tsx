import { useState, useCallback } from 'react'
import { UrlForm } from '@/components/UrlForm'
import { ResultDisplay } from '@/components/ResultDisplay'
import { inspectUrl, type InspectionResult } from '@/lib/urlInspector'
import { AlertCircle, Link2, GitBranch, Route, ShieldCheck, Eye, Zap } from 'lucide-react'
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
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="text-center py-8 space-y-4">
                <div className="p-4 rounded-full bg-primary/5 inline-flex animate-in fade-in slide-in-from-top-2 duration-500">
                  <Link2 className="h-8 w-8 text-primary/60" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Paste a shortened or redirect-heavy URL above to inspect it
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    Works with bit.ly, t.co, google.com/url, Amazon, Facebook, Reddit, and any redirect chain
                  </p>
                </div>
              </div>

              {/* Feature cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border bg-card p-4 space-y-2 hover:border-primary/30 transition-colors duration-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-blue-500/10">
                      <Route className="h-4 w-4 text-blue-500" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Redirect Chain
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed">
                    Follow every hop from start to finish — see status codes, timing, and response headers.
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-4 space-y-2 hover:border-primary/30 transition-colors duration-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-green-500/10">
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tracker Removal
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed">
                    Automatically detect and strip UTM, social, and marketing tracking parameters.
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-4 space-y-2 hover:border-primary/30 transition-colors duration-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-amber-500/10">
                      <Eye className="h-4 w-4 text-amber-500" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      OG Preview
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed">
                    See preview cards of the final destination — title, description, and image.
                  </p>
                </div>

                <div className="rounded-lg border bg-card p-4 space-y-2 hover:border-primary/30 transition-colors duration-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-purple-500/10">
                      <Zap className="h-4 w-4 text-purple-500" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Speed Metrics
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/80 leading-relaxed">
                    Measure latency per hop with visual timing bars and total request time.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </TooltipProvider>
  )
}
