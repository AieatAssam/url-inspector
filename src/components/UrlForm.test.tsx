import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UrlForm } from './UrlForm'

describe('UrlForm', () => {
  it('renders input and submit button', () => {
    render(<UrlForm onSubmit={() => {}} isLoading={false} />)
    expect(screen.getByPlaceholderText('Paste a URL to inspect...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /inspect/i })).toBeInTheDocument()
  })

  it('calls onSubmit with the entered URL', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<UrlForm onSubmit={onSubmit} isLoading={false} />)

    const input = screen.getByPlaceholderText('Paste a URL to inspect...')
    await user.type(input, 'https://example.com')
    await user.click(screen.getByRole('button', { name: /inspect/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith('https://example.com')
  })

  it('disables button when loading', () => {
    render(<UrlForm onSubmit={() => {}} isLoading={true} />)
    expect(screen.getByRole('button', { name: /inspecting/i })).toBeDisabled()
  })

  it('disables button when input is empty', () => {
    render(<UrlForm onSubmit={() => {}} isLoading={false} />)
    expect(screen.getByRole('button', { name: /inspect/i })).toBeDisabled()
  })

  it('enables button when input has text', async () => {
    const user = userEvent.setup()
    render(<UrlForm onSubmit={() => {}} isLoading={false} />)

    const input = screen.getByPlaceholderText('Paste a URL to inspect...')
    await user.type(input, 'https://example.com')

    expect(screen.getByRole('button', { name: /inspect/i })).toBeEnabled()
  })

  it('shows example URLs that can be clicked', async () => {
    const user = userEvent.setup()
    render(<UrlForm onSubmit={() => {}} isLoading={false} />)

    const exampleButton = screen.getByText('https://bit.ly/example')
    await user.click(exampleButton)

    const input = screen.getByPlaceholderText('Paste a URL to inspect...')
    expect(input).toHaveValue('https://bit.ly/example')
  })

  it('does not submit on empty input', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<UrlForm onSubmit={onSubmit} isLoading={false} />)

    const input = screen.getByPlaceholderText('Paste a URL to inspect...')
    await user.type(input, '   ')
    await user.click(screen.getByRole('button', { name: /inspect/i }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits on Enter key', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<UrlForm onSubmit={onSubmit} isLoading={false} />)

    const input = screen.getByPlaceholderText('Paste a URL to inspect...')
    await user.type(input, 'https://example.com{Enter}')

    expect(onSubmit).toHaveBeenCalledWith('https://example.com')
  })
})
