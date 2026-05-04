import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { HopNode } from './HopNode'
import type { Hop } from '@/lib/urlInspector'

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

const redirectHop: Hop = {
  url: 'https://example.com/redirect',
  statusCode: 301,
  statusText: 'Moved Permanently',
  timingMs: 150,
  location: 'https://example.com/final',
  isFinal: false,
}

const finalHop: Hop = {
  url: 'https://example.com/final',
  statusCode: 200,
  statusText: 'OK',
  timingMs: 200,
  location: null,
  isFinal: true,
}

const errorHop: Hop = {
  url: 'https://example.com/error',
  statusCode: 0,
  statusText: 'Error',
  timingMs: 0,
  location: null,
  error: 'CORS / Network error',
  isFinal: true,
}

const notFoundHop: Hop = {
  url: 'https://example.com/notfound',
  statusCode: 404,
  statusText: 'Not Found',
  timingMs: 100,
  location: null,
  isFinal: true,
}

const serverErrorHop: Hop = {
  url: 'https://example.com/servererror',
  statusCode: 500,
  statusText: 'Internal Server Error',
  timingMs: 300,
  location: null,
  isFinal: true,
}

const unknownStatusHop: Hop = {
  url: 'https://example.com/unknown',
  statusCode: 999,
  statusText: 'Unknown',
  timingMs: 50,
  location: null,
  isFinal: true,
}

const slowHop: Hop = {
  url: 'https://example.com/slow',
  statusCode: 200,
  statusText: 'OK',
  timingMs: 1500,
  location: null,
  isFinal: true,
}

const mediumHop: Hop = {
  url: 'https://example.com/medium',
  statusCode: 200,
  statusText: 'OK',
  timingMs: 750,
  location: null,
  isFinal: true,
}

describe('HopNode', () => {
  it('renders redirect URL', () => {
    renderWithProvider(<HopNode hop={redirectHop} index={0} maxTiming={300} showAdvanced={false} />)
    expect(screen.getByTitle('https://example.com/redirect')).toBeInTheDocument()
  })

  it('shows status code badge for 301 redirect', () => {
    renderWithProvider(<HopNode hop={redirectHop} index={0} maxTiming={300} showAdvanced={false} />)
    expect(screen.getByText('301')).toBeInTheDocument()
  })

  it('renders final hop URL', () => {
    renderWithProvider(<HopNode hop={finalHop} index={1} maxTiming={300} showAdvanced={false} />)
    expect(screen.getByTitle('https://example.com/final')).toBeInTheDocument()
  })

  it('shows status code badge for 200', () => {
    renderWithProvider(<HopNode hop={finalHop} index={1} maxTiming={300} showAdvanced={false} />)
    expect(screen.getByText('200')).toBeInTheDocument()
  })

  it('shows status code badge for 404', () => {
    renderWithProvider(<HopNode hop={notFoundHop} index={0} maxTiming={300} showAdvanced={false} />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('shows status code badge for 500', () => {
    renderWithProvider(<HopNode hop={serverErrorHop} index={0} maxTiming={300} showAdvanced={false} />)
    expect(screen.getByText('500')).toBeInTheDocument()
  })

  it('handles unknown status codes with fallback badge', () => {
    renderWithProvider(<HopNode hop={unknownStatusHop} index={0} maxTiming={300} showAdvanced={false} />)
    expect(screen.getByText('999')).toBeInTheDocument()
  })

  it('shows timing in milliseconds', () => {
    renderWithProvider(<HopNode hop={redirectHop} index={0} maxTiming={300} showAdvanced={false} />)
    expect(screen.getByText('150ms')).toBeInTheDocument()
  })

  it('shows timing in seconds for slow requests', () => {
    renderWithProvider(<HopNode hop={slowHop} index={0} maxTiming={3000} showAdvanced={false} />)
    expect(screen.getByText('1500ms')).toBeInTheDocument()
  })

  it('shows timing with medium latency (yellow bar)', () => {
    renderWithProvider(<HopNode hop={mediumHop} index={0} maxTiming={3000} showAdvanced={false} />)
    expect(screen.getByText('750ms')).toBeInTheDocument()
  })

  it('shows error message when present', () => {
    renderWithProvider(<HopNode hop={errorHop} index={0} maxTiming={0} showAdvanced={false} />)
    expect(screen.getByText('CORS / Network error')).toBeInTheDocument()
  })

  it('shows external link button', () => {
    renderWithProvider(<HopNode hop={redirectHop} index={0} maxTiming={300} showAdvanced={false} />)
    const links = screen.getAllByRole('link')
    expect(links.some(l => l.getAttribute('href') === 'https://example.com/redirect')).toBe(true)
  })

  it('shows location header in advanced mode', () => {
    renderWithProvider(<HopNode hop={redirectHop} index={0} maxTiming={300} showAdvanced={true} />)
    expect(screen.getByText(/https:\/\/example.com\/final/)).toBeInTheDocument()
  })

  it('shows full URL in advanced mode', () => {
    renderWithProvider(<HopNode hop={redirectHop} index={0} maxTiming={300} showAdvanced={true} />)
    expect(screen.getByText('https://example.com/redirect')).toBeInTheDocument()
  })

  it('truncates URL in basic mode', () => {
    const longUrlHop: Hop = {
      url: 'https://example.com/this/is/a/very/long/path/that/should/be/truncated/in/basic/mode?q=test',
      statusCode: 200,
      statusText: 'OK',
      timingMs: 100,
      location: null,
      isFinal: true,
    }
    renderWithProvider(<HopNode hop={longUrlHop} index={0} maxTiming={300} showAdvanced={false} />)
    const urlSpan = screen.getByTitle(longUrlHop.url)
    expect(urlSpan.textContent).toContain('…')
  })
})
