import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { PrefixBreadcrumb } from './PrefixBreadcrumb'

function wrap(ui: React.ReactNode) {
  return <MemoryRouter>{ui}</MemoryRouter>
}

describe('PrefixBreadcrumb [S3-02]', () => {
  test('renders one item per prefix segment plus the bucket name', () => {
    render(
      wrap(
        <PrefixBreadcrumb
          bucketName="my-bucket"
          prefix="photos/2026/"
          onNavigate={() => {}}
        />,
      ),
    )
    // Cloudscape BreadcrumbGroup renders items as links + last one as current.
    // It also duplicates each item into an aria-hidden "ghost" list for
    // responsive measurement, so we use getAllByText and verify count >= 1.
    expect(screen.getAllByText('my-bucket').length).toBeGreaterThan(0)
    expect(screen.getAllByText('photos').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2026').length).toBeGreaterThan(0)
  })

  test('clicking a non-root segment navigates to that accumulated prefix', () => {
    const onNavigate = vi.fn()
    render(
      wrap(
        <PrefixBreadcrumb
          bucketName="my-bucket"
          prefix="photos/2026/spring/"
          onNavigate={onNavigate}
        />,
      ),
    )
    // First match is the real (non-ghost) breadcrumb link
    fireEvent.click(screen.getAllByText('photos')[0])
    expect(onNavigate).toHaveBeenCalledWith('photos/')
  })

  test('clicking the root (bucket name) item clears the prefix', () => {
    const onNavigate = vi.fn()
    render(
      wrap(
        <PrefixBreadcrumb
          bucketName="my-bucket"
          prefix="photos/2026/"
          onNavigate={onNavigate}
        />,
      ),
    )
    fireEvent.click(screen.getAllByText('my-bucket')[0])
    expect(onNavigate).toHaveBeenCalledWith('')
  })

  test('renders only the bucket name when prefix is empty', () => {
    render(
      wrap(
        <PrefixBreadcrumb
          bucketName="my-bucket"
          prefix=""
          onNavigate={() => {}}
        />,
      ),
    )
    expect(screen.getAllByText('my-bucket').length).toBeGreaterThan(0)
  })
})
