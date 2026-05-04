import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ResultDisplay } from './ResultDisplay'
import type { InspectionResult } from '@/lib/urlInspector'

const mockResult: InspectionResult = {
  originalUrl: 'https://bit.ly/test',
  cleanUrl: null,
  hops: [
    { url: 'https://bit.ly/test', statusCode: 200, statusText: 'OK', timingMs: 100, location: null, isFinal: true },
  ],
  totalRedirects: 0,
  totalTiming: 100,
  finalUrl: 'https://bit.ly/test',
  proxyUsed: false,
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

describe('ResultDisplay', () => {
  it('renders the summary card', () => {
    renderWithProvider(<ResultDisplay result={mockResult} />)
    expect(screen.getByText('Final Destination')).toBeInTheDocument()
  })

  it('renders the redirect chain', () => {
    renderWithProvider(<ResultDisplay result={mockResult} />)
    expect(screen.getByText('No redirects')).toBeInTheDocument()
  })

  it('handles results with redirects', () => {
    const resultWithRedirects: InspectionResult = {
      originalUrl: 'https://bit.ly/test',
      cleanUrl: null,
      hops: [
        { url: 'https://bit.ly/test', statusCode: 301, statusText: 'Moved', timingMs: 100, location: 'https://example.com', isFinal: false },
        { url: 'https://example.com', statusCode: 200, statusText: 'OK', timingMs: 150, location: null, isFinal: true },
      ],
      totalRedirects: 1,
      totalTiming: 250,
      finalUrl: 'https://example.com',
      proxyUsed: false,
    }
    renderWithProvider(<ResultDisplay result={resultWithRedirects} />)
    expect(screen.getByText('Final Destination')).toBeInTheDocument()
  })
})
