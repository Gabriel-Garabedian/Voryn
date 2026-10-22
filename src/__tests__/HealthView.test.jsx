import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }))
vi.mock('@/services/healthRecords', async importOriginal => ({ ...await importOriginal(), manualHealthService: { list: vi.fn(async () => []), save: vi.fn(), remove: vi.fn() } }))
vi.mock('@/services/health', async importOriginal => ({ ...await importOriginal(), healthService: {
  isAndroid: () => true, status: vi.fn(), read: vi.fn(), save: vi.fn(), connect: vi.fn(),
  history: vi.fn(), remove: vi.fn(), openSettings: vi.fn(), diagnose: vi.fn(),
  onResume: vi.fn(async () => ({ remove: vi.fn() })),
} }))
import HealthView from '@/views/HealthView'
import { healthService } from '@/services/health'
const show = () => render(<MemoryRouter><HealthView /></MemoryRouter>)
beforeEach(() => {
  vi.clearAllMocks()
  healthService.history.mockResolvedValue([])
  healthService.status.mockResolvedValue({ available: true, permissions: ['steps'] })
  healthService.read.mockResolvedValue({ syncedAt: '2026-10-22T12:00:00Z', days: [{ date: '2026-10-22', steps: 123, permissions: ['steps'] }] })
})
afterEach(cleanup)
describe('health connection hub', () => {
  it('uploads imported data only after an explicit save action', async () => {
    show()
    await screen.findByText('Dados disponíveis no Health Connect foram lidos.')
    expect(healthService.save).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Salvar resumos importados na conta' }))
    await waitFor(() => expect(healthService.save).toHaveBeenCalledWith('owner', expect.objectContaining({ days: expect.any(Array) })))
  })
  it('does not read health data when permissions are denied', async () => {
    healthService.status.mockResolvedValue({ available: true, permissions: [] })
    show()
    await screen.findByText('Categorias autorizadas: nenhuma.')
    expect(healthService.read).not.toHaveBeenCalled()
    expect(healthService.save).not.toHaveBeenCalled()
  })
  it('distinguishes granted permission from an empty provider', async () => {
    healthService.read.mockResolvedValue({ days: [{ date: '2026-10-22', permissions: ['steps'] }] })
    show()
    await screen.findByText(/Permissões ativas, mas o Health Connect não retornou valores/)
    expect(screen.getByRole('button', { name: 'Salvar resumos importados na conta' })).toBeDisabled()
    expect(healthService.save).not.toHaveBeenCalled()
  })
  it('checks raw record availability separately from permissions', async () => {
    healthService.diagnose.mockResolvedValue({ categories: [{ category: 'steps', allowed: true, hasRecords: false, sources: [] }] })
    show()
    await screen.findByText('Dados disponíveis no Health Connect foram lidos.')
    fireEvent.click(screen.getByRole('button', { name: 'Verificar dados na fonte' }))
    await screen.findByText('Nenhum registro')
    expect(healthService.diagnose).toHaveBeenCalledTimes(1)
  })
  it('links each category to its own route', async () => {
    show()
    expect(screen.getByRole('link', { name: /Água Registros/ })).toHaveAttribute('href', '/app/health/water')
    expect(screen.getByRole('link', { name: /Sono Registros/ })).toHaveAttribute('href', '/app/health/sleep')
  })
})
