import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TooltipProvider } from '@/components/ui/tooltip'
import { RedirectChain } from './RedirectChain'
import type { Hop } from '@/lib/urlInspector'

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

const hops: Hop[] = [
  {
    url: 'https://bit.ly/short',
    statusCode: 301,
    statusText: 'Moved',
    timingMs: 100,
    location: 'https://example.com/final',
    isFinal: false,
  },
  {
    url: 'https://example.com/final',
    statusCode: 200,
    statusText: 'OK',
    timingMs: 200,
    location: null,
    isFinal: true,
  },
]

const singleHop: Hop[] = [
  {
    url: 'https://example.com/direct',
    statusCode: 200,
    statusText: 'OK',
    timingMs: 50,
    location: null,
    isFinal: true,
  },
]

describe('RedirectChain', () => {
  it('shows redirect count when collapsed', () => {
    renderWithProvider(
      <RedirectChain hops={hops} expanded={false} onToggleExpanded={() => {}} />
    )
    expect(screen.getByText('1 redirect')).toBeInTheDocument()
  })

  it('shows "No redirects" when collapsed and none found', () => {
    renderWithProvider(
      <RedirectChain hops={singleHop} expanded={false} onToggleExpanded={() => {}} />
    )
    expect(screen.getByText('No redirects')).toBeInTheDocument()
  })

  it('shows hop count in header when expanded', () => {
    renderWithProvider(
      <RedirectChain hops={hops} expanded={true} onToggleExpanded={() => {}} />
    )
    expect(screen.getByText(/2 hops/)).toBeInTheDocument()
  })

  it('shows advanced mode toggle when expanded', () => {
    renderWithProvider(
      <RedirectChain hops={hops} expanded={true} onToggleExpanded={() => {}} />
    )
    expect(screen.getByText(/Advanced/)).toBeInTheDocument()
  })

  it('hides advanced toggle when collapsed', () => {
    renderWithProvider(
      <RedirectChain hops={hops} expanded={false} onToggleExpanded={() => {}} />
    )
    expect(screen.queryByText(/Advanced/)).not.toBeInTheDocument()
  })

  it('shows hop nodes when expanded', () => {
    renderWithProvider(
      <RedirectChain hops={hops} expanded={true} onToggleExpanded={() => {}} />
    )
    expect(screen.getByTitle('https://bit.ly/short')).toBeInTheDocument()
    expect(screen.getByTitle('https://example.com/final')).toBeInTheDocument()
  })

  it('toggles expansion on click', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    renderWithProvider(
      <RedirectChain hops={hops} expanded={false} onToggleExpanded={onToggle} />
    )
    const toggleButton = screen.getByText('1 redirect').closest('button')
    if (toggleButton) {
      await user.click(toggleButton)
      expect(onToggle).toHaveBeenCalledTimes(1)
    }
  })

  it('shows "Proxy Resolved" label when single hop is synthetic', () => {
    const syntheticHops: Hop[] = [
      {
        url: 'https://bit.ly/short',
        statusCode: 200,
        statusText: 'Proxy Resolved',
        timingMs: 150,
        location: null,
        isFinal: true,
        synthetic: true,
      },
    ]
    renderWithProvider(
      <RedirectChain hops={syntheticHops} expanded={false} onToggleExpanded={() => {}} />
    )
    expect(screen.getByText('Proxy Resolved')).toBeInTheDocument()
  })

  it('renders empty state for no hops', () => {
    const { container } = renderWithProvider(
      <RedirectChain hops={[]} expanded={false} onToggleExpanded={() => {}} />
    )
    // Should render nothing for empty hops
    expect(container.textContent).toBe('')
  })
})
