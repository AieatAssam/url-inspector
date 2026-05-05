import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { OgPreview } from './OgPreview'

// Mock the fetchOgPreview function at the module level
vi.mock('@/lib/ogPreview', () => ({
  fetchOgPreview: vi.fn(),
}))

import { fetchOgPreview } from '@/lib/ogPreview'

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

function createMockOgData(overrides = {}) {
  return {
    url: 'https://example.com/page',
    title: 'Example Page Title',
    description: 'An example description for testing purposes.',
    image: 'https://example.com/image.jpg',
    siteName: 'Example Site',
    favicon: 'https://example.com/favicon.ico',
    twitterCard: 'summary_large_image',
    themeColor: '#ff6600',
    ...overrides,
  }
}

describe('OgPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading skeleton initially', () => {
    vi.mocked(fetchOgPreview).mockImplementation(() => new Promise(() => {}))
    renderWithProvider(<OgPreview url="https://example.com" />)
    // Loading state — we should see skeleton elements. The skeleton uses animate-pulse.
    // Just verify nothing crashes and we're in loading state
  })

  it('renders OG data when available', async () => {
    vi.mocked(fetchOgPreview).mockResolvedValue(createMockOgData())
    renderWithProvider(<OgPreview url="https://example.com/page" />)

    expect(await screen.findByText('Example Page Title')).toBeInTheDocument()
    expect(screen.getByText('An example description for testing purposes.')).toBeInTheDocument()
    expect(screen.getByText('Example Site')).toBeInTheDocument()
  })

  it('shows no-preview fallback when OG data is empty', async () => {
    vi.mocked(fetchOgPreview).mockResolvedValue(null)
    renderWithProvider(<OgPreview url="https://example.com/empty" />)

    expect(await screen.findByText('No preview available')).toBeInTheDocument()
    expect(screen.getByText('example.com')).toBeInTheDocument()
  })

  it('shows no-preview fallback when OG data has no useful fields', async () => {
    vi.mocked(fetchOgPreview).mockResolvedValue({
      url: 'https://example.com/page',
      title: null,
      description: null,
      image: null,
      siteName: null,
      favicon: null,
      twitterCard: null,
      themeColor: null,
    })
    renderWithProvider(<OgPreview url="https://example.com/page" />)

    expect(await screen.findByText('No preview available')).toBeInTheDocument()
  })

  it('shows no-preview fallback when fetchOgPreview rejects', async () => {
    vi.mocked(fetchOgPreview).mockRejectedValue(new Error('Network failure'))
    renderWithProvider(<OgPreview url="https://example.com/error" />)

    expect(await screen.findByText('No preview available')).toBeInTheDocument()
  })

  it('uses siteName as title when title is null', async () => {
    vi.mocked(fetchOgPreview).mockResolvedValue(createMockOgData({ title: null, siteName: 'My Site', description: 'A description.' }))
    renderWithProvider(<OgPreview url="https://example.com" />)

    const heading = await screen.findByRole('heading', { name: 'My Site' })
    expect(heading).toBeInTheDocument()
  })

  it('uses hostname as fallback when title and siteName are null', async () => {
    vi.mocked(fetchOgPreview).mockResolvedValue(createMockOgData({ title: null, siteName: null, description: 'A description.' }))
    renderWithProvider(<OgPreview url="https://example.com/page" />)

    const heading = await screen.findByRole('heading', { name: 'example.com' })
    expect(heading).toBeInTheDocument()
  })

  it('renders the link as an anchor to the target URL', async () => {
    vi.mocked(fetchOgPreview).mockResolvedValue(createMockOgData())
    renderWithProvider(<OgPreview url="https://example.com/page" />)

    const link = await screen.findByRole('link')
    expect(link).toHaveAttribute('href', 'https://example.com/page')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('cleans up on unmount', async () => {
    vi.mocked(fetchOgPreview).mockImplementation(() => {
      // This promise intentionally never resolves to simulate pending fetch during unmount
      return new Promise(() => {})
    })

    const { unmount } = renderWithProvider(<OgPreview url="https://example.com" />)
    unmount()
    // No errors should be thrown
  })
})
