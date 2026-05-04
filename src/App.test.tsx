import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

// Mock the urlInspector module
vi.mock('@/lib/urlInspector', () => ({
  inspectUrl: vi.fn(),
  isShortUrl: vi.fn(),
  countTrackingParams: vi.fn(),
}))

import { inspectUrl } from '@/lib/urlInspector'

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the app title', () => {
    render(<App />)
    expect(screen.getByText('URL Inspector')).toBeInTheDocument()
  })

  it('renders the description', () => {
    render(<App />)
    expect(screen.getByText(/Uncover the full redirect chain/)).toBeInTheDocument()
  })

  it('renders the URL form', () => {
    render(<App />)
    expect(screen.getByPlaceholderText('Paste a URL to inspect...')).toBeInTheDocument()
  })

  it('shows the empty state by default', () => {
    render(<App />)
    expect(screen.getByText(/Paste a shortened or redirect-heavy URL above/)).toBeInTheDocument()
  })

  it('renders the footer', () => {
    render(<App />)
    expect(screen.getByText('Source Code')).toBeInTheDocument()
  })

  it('shows loading state during inspection', async () => {
    const user = userEvent.setup()
    // Never resolves to keep loading state visible
    vi.mocked(inspectUrl).mockImplementationOnce(() => new Promise(() => {}))

    render(<App />)
    const input = screen.getByPlaceholderText('Paste a URL to inspect...')
    await user.type(input, 'https://example.com')
    await user.click(screen.getByRole('button', { name: /inspect/i }))

    expect(screen.getByText('Inspecting')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /inspecting/i })).toBeDisabled()
  })

  it('shows success result after inspection', async () => {
    const user = userEvent.setup()
    vi.mocked(inspectUrl).mockResolvedValueOnce({
      originalUrl: 'https://example.com',
      cleanUrl: 'https://example.com',
      hops: [{ url: 'https://example.com', statusCode: 200, statusText: 'OK', timingMs: 100, location: null, isFinal: true }],
      totalRedirects: 0,
      totalTiming: 100,
      finalUrl: 'https://example.com',
      proxyUsed: false,
    })

    render(<App />)
    const input = screen.getByPlaceholderText('Paste a URL to inspect...')
    await user.type(input, 'https://example.com')
    await user.click(screen.getByRole('button', { name: /inspect/i }))

    expect(await screen.findByText('Final Destination')).toBeInTheDocument()
  })

  it('shows error message on failure', async () => {
    const user = userEvent.setup()
    vi.mocked(inspectUrl).mockRejectedValueOnce(new Error('Network failure'))

    render(<App />)
    const input = screen.getByPlaceholderText('Paste a URL to inspect...')
    await user.type(input, 'https://example.com')
    await user.click(screen.getByRole('button', { name: /inspect/i }))

    expect(await screen.findByText('Network failure')).toBeInTheDocument()
    expect(screen.getByText('Inspection failed')).toBeInTheDocument()
  })
})
