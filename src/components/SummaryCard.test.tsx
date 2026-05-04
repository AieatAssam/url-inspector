import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SummaryCard } from './SummaryCard'
import type { InspectionResult } from '@/lib/urlInspector'

const mockResult: InspectionResult = {
  originalUrl: 'https://example.com/original?utm_source=test',
  cleanUrl: 'https://example.com/original',
  hops: [
    { url: 'https://example.com/original', statusCode: 301, statusText: 'Moved', timingMs: 150, location: 'https://example.com/final', isFinal: false },
    { url: 'https://example.com/final', statusCode: 200, statusText: 'OK', timingMs: 200, location: null, isFinal: true },
  ],
  totalRedirects: 1,
  totalTiming: 350,
  finalUrl: 'https://example.com/final',
  proxyUsed: false,
  wrapperDetected: false,
}

const directResult: InspectionResult = {
  originalUrl: 'https://example.com/some/very/long/path/that/gets/truncated/in/the/display?q=search',
  cleanUrl: null,
  hops: [
    { url: 'https://example.com/some/very/long/path/that/gets/truncated/in/the/display?q=search', statusCode: 200, statusText: 'OK', timingMs: 100, location: null, isFinal: true },
  ],
  totalRedirects: 0,
  totalTiming: 100,
  finalUrl: 'https://example.com/some/very/long/path/that/gets/truncated/in/the/display?q=search',
  proxyUsed: false,
  wrapperDetected: false,
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

describe('SummaryCard', () => {
  it('shows "Final Destination" label', () => {
    renderWithProvider(<SummaryCard result={mockResult} />)
    expect(screen.getByText('Final Destination')).toBeInTheDocument()
  })

  it('shows final URL', () => {
    renderWithProvider(<SummaryCard result={mockResult} />)
    expect(screen.getByTitle('https://example.com/final')).toBeInTheDocument()
  })

  it('shows redirect count', () => {
    renderWithProvider(<SummaryCard result={mockResult} />)
    expect(screen.getByText(/1 redirect/)).toBeInTheDocument()
  })

  it('shows "Direct" for zero redirects', () => {
    renderWithProvider(<SummaryCard result={directResult} />)
    expect(screen.getByText(/Direct/)).toBeInTheDocument()
  })

  it('shows total timing', () => {
    renderWithProvider(<SummaryCard result={mockResult} />)
    expect(screen.getByText(/350ms/)).toBeInTheDocument()
  })

  it('shows clean URL section when tracking params found', () => {
    renderWithProvider(<SummaryCard result={mockResult} />)
    expect(screen.getByText('Tracking parameters stripped')).toBeInTheDocument()
  })

  it('shows "Clean" badge when no tracking params', () => {
    renderWithProvider(<SummaryCard result={directResult} />)
    expect(screen.getByText(/Clean/)).toBeInTheDocument()
  })

  it('shows "Trackers found" badge when trackers present', () => {
    renderWithProvider(<SummaryCard result={mockResult} />)
    expect(screen.getByText('Trackers found')).toBeInTheDocument()
  })

  it('has copy buttons for URLs', () => {
    renderWithProvider(<SummaryCard result={mockResult} />)
    const buttons = screen.getAllByRole('button')
    // Should have at least a copy button and potentially tooltip triggers
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it('has external link to final URL', () => {
    renderWithProvider(<SummaryCard result={mockResult} />)
    const links = screen.getAllByRole('link')
    expect(links.some(l => l.getAttribute('href') === 'https://example.com/final')).toBe(true)
  })

  it('truncates long URLs', () => {
    renderWithProvider(<SummaryCard result={directResult} />)
    expect(screen.getByTitle('https://example.com/some/very/long/path/that/gets/truncated/in/the/display?q=search')).toBeInTheDocument()
  })
})
