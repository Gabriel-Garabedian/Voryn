import React from 'react'
import { render, screen, within, fireEvent, cleanup, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
const navigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }))
vi.mock('@/services/healthRecords', async importOriginal => ({ ...await importOriginal(), manualHealthService: { list: vi.fn(async () => []), save: vi.fn(), remove: vi.fn() } }))
vi.mock('@/services/health', async importOriginal => ({ ...await importOriginal(), healthService: {
  isAndroid: () => true, status: vi.fn(), read: vi.fn(), history: vi.fn(), save: vi.fn(),
  onResume: vi.fn(async () => ({ remove: vi.fn() })),
} }))
import HomeHealthCards from '@/components/health/HomeHealthCards'
import { healthService } from '@/services/health'
import { localDateKey } from '@/utils/helpers'

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  healthService.status.mockResolvedValue({ available: true, permissions: ['steps'] })
  healthService.history.mockResolvedValue([])
  healthService.read.mockResolvedValue({ days: [{ date: localDateKey(), steps: 0, permissions: ['steps'] }], syncedAt: new Date().toISOString() })
})
afterEach(cleanup)

describe('home health tiles', () => {
  it('shows real zero steps, opens the metric, and never uploads data', async () => {
    render(<HomeHealthCards />)
    await screen.findByText('Health Connect conectado')
    const steps = screen.getByRole('button', { name: 'Ver passos' })
    expect(within(steps).getByText('0')).toBeInTheDocument()
    expect(healthService.save).not.toHaveBeenCalled()
    fireEvent.click(steps)
    expect(navigate).toHaveBeenCalledWith('/app/health/steps')
  })
  it('does not read data before permission and offers connection', async () => {
    healthService.status.mockResolvedValue({ available: true, permissions: [] })
    render(<HomeHealthCards />)
    await screen.findByText('Sua saúde no Voryn')
    expect(healthService.read).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Conectar' }))
    expect(navigate).toHaveBeenCalledWith('/app/health')
  })
  it('does not show historical steps as todays steps', async () => {
    healthService.read.mockResolvedValue({ days: [{ date: '2000-01-01', steps: 999, weight_kg: 72 }], syncedAt: new Date().toISOString() })
    render(<HomeHealthCards />)
    await screen.findByText('Health Connect conectado')
    expect(within(screen.getByRole('button', { name: 'Ver passos' })).getByText('—')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: 'Ver peso' })).getByText('72')).toBeInTheDocument()
  })
  it('shows connection failures instead of presenting an empty connected state', async () => {
    healthService.status.mockRejectedValue(new Error('Permissões indisponíveis'))
    render(<HomeHealthCards />)
    await screen.findByText('A conexão precisa de atenção')
    expect(screen.getByText('Permissões indisponíveis')).toBeInTheDocument()
  })
  it('reads the phone even when the cloud database does not respond', async () => {
    vi.useFakeTimers()
    healthService.history.mockImplementation(() => new Promise(() => {}))
    try {
      render(<HomeHealthCards />)
      await act(async () => { await vi.advanceTimersByTimeAsync(0) })
      expect(healthService.read).toHaveBeenCalled()
      expect(within(screen.getByRole('button', { name: 'Ver passos' })).getByText('0')).toBeInTheDocument()
      await act(async () => { await vi.advanceTimersByTimeAsync(20000) })
      expect(screen.getByText(/O banco demorou para responder/)).toBeInTheDocument()
    } finally { vi.useRealTimers() }
  })
})
