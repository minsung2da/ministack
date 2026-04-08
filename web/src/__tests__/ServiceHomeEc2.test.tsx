import { describe, it, expect, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/utils'
import { mswServer, http, HttpResponse } from '../test/msw'
import { setupMswForTest } from '../test/msw-setup'
import ServiceHome from '../pages/ServiceHome'

setupMswForTest()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  )
  return { ...actual, useParams: () => ({ serviceKey: 'ec2' }) }
})

vi.mock('../shared/api/services', () => ({
  useServices: () => ({
    data: [{ key: 'ec2', name: 'EC2', category: 'Compute' }],
    isLoading: false,
    error: null,
  }),
}))

const EC2_XML = `<?xml version="1.0"?>
<DescribeInstancesResponse>
  <reservationSet>
    <item>
      <instancesSet>
        <item><instanceId>i-1</instanceId><instanceState><name>running</name></instanceState></item>
        <item><instanceId>i-2</instanceId><instanceState><name>running</name></instanceState></item>
        <item><instanceId>i-3</instanceId><instanceState><name>running</name></instanceState></item>
        <item><instanceId>i-4</instanceId><instanceState><name>stopped</name></instanceState></item>
        <item><instanceId>i-5</instanceId><instanceState><name>stopped</name></instanceState></item>
      </instancesSet>
    </item>
  </reservationSet>
</DescribeInstancesResponse>`

describe('ServiceHome — EC2 rollup (NAV-04)', () => {
  it('parses DescribeInstances XML and shows count + running/stopped rollup', async () => {
    mswServer.use(
      http.post('http://localhost/', async () => {
        return new HttpResponse(EC2_XML, {
          headers: { 'Content-Type': 'application/xml' },
        })
      }),
    )
    renderWithProviders(<ServiceHome />, { route: '/services/ec2' })
    await waitFor(() => {
      expect(screen.getByText(/5 instances/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/3 running/i)).toBeInTheDocument()
    expect(screen.getByText(/2 stopped/i)).toBeInTheDocument()
  })
})
