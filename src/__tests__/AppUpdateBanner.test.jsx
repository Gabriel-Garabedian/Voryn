import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import AppUpdateBanner from '@/components/ui/AppUpdateBanner'
import { appUpdate } from '@/services/appUpdate'

vi.mock('@/services/appUpdate', () => ({ appUpdate: { check: vi.fn(), open: vi.fn() } }))
const release = { versionCode: 9, versionName: '1.8', apkPath: '/downloads/voryn-1.8.apk' }
beforeEach(() => {
  vi.clearAllMocks()
  appUpdate.check.mockResolvedValue(release)
  appUpdate.open.mockResolvedValue(undefined)
})
afterEach(cleanup)

it('offers a download, reports opening errors and can be dismissed', async () => {
  appUpdate.open.mockRejectedValueOnce(new Error('Navegador indisponível'))
  render(<AppUpdateBanner />)
  fireEvent.click(await screen.findByText('Baixar atualização'))
  await waitFor(() => expect(appUpdate.open).toHaveBeenCalledWith(release))
  expect(await screen.findByRole('alert')).toHaveTextContent('Navegador indisponível')
  fireEvent.click(screen.getByText('Agora não'))
  expect(screen.queryByText('Baixar atualização')).not.toBeInTheDocument()
})

it('does not interrupt an active workout and shows the notice after it', async () => {
  const { rerender } = render(<AppUpdateBanner hidden />)
  await waitFor(() => expect(appUpdate.check).toHaveBeenCalled())
  expect(screen.queryByText('Baixar atualização')).not.toBeInTheDocument()
  rerender(<AppUpdateBanner />)
  expect(await screen.findByText('Baixar atualização')).toBeInTheDocument()
})

it('stays silent if the network check fails', async () => {
  appUpdate.check.mockRejectedValueOnce(new Error('offline'))
  const { container } = render(<AppUpdateBanner />)
  await waitFor(() => expect(appUpdate.check).toHaveBeenCalled())
  expect(container).toBeEmptyDOMElement()
})
