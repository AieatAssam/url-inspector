import { useState, type FormEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, Search } from 'lucide-react'

interface UrlFormProps {
  onSubmit: (url: string) => void
  isLoading: boolean
}

const EXAMPLE_URLS = [
  'https://bit.ly/3ENLcS1',
  'https://www.google.com/url?q=https://example.com',
  'https://example.com/?utm_source=twitter&utm_medium=social&fbclid=abc123',
]

export function UrlForm({ onSubmit, isLoading }: UrlFormProps) {
  const [url, setUrl] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (url.trim()) onSubmit(url.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Paste a URL to inspect..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-12 pr-10 pl-4 text-base font-mono"
            disabled={isLoading}
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={isLoading || !url.trim()}
          className="h-12 px-6 font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Inspecting
            </>
          ) : (
            'Inspect'
          )}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Try:</span>
        {EXAMPLE_URLS.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setUrl(example)}
            className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-xs font-mono transition-colors cursor-pointer"
            disabled={isLoading}
          >
            {example}
          </button>
        ))}
      </div>
    </form>
  )
}
