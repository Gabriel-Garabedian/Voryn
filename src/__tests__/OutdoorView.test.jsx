import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, beforeEach, expect } from 'vitest'
import OutdoorView from '@/views/OutdoorView'
import { outdoorActivity } from '@/services/outdoorActivity'

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'account-a' } }) }))
vi.mock('@/components/OutdoorRouteMap', () => ({ default: () => <div>Mapa do trajeto</div> }))
vi.mock('@/components/ui', () => ({ Button: ({ loading, children, ...props }) => <button disabled={loading} {...props}>{children}</button> }))
vi.mock('@/services/outdoorActivity', async importOriginal => ({
  ...await importOriginal(),
  outdoorActivity: { available: vi.fn(), read: vi.fn(), start: vi.fn(), pause: vi.fn(), finish: vi.fn(), detail: vi.fn(), delete: vi.fn() },
}))
const active = { id: 'route-a', sport: 'running', status: 'paused', distanceMeters: 1000, elapsedMs: 300000, points: [], error: 'Gravação interrompida' }
const open = () => render(<MemoryRouter><OutdoorView /></MemoryRouter>)

beforeEach(() => {
  vi.resetAllMocks()
  outdoorActivity.available.mockReturnValue(true)
  outdoorActivity.read.mockResolvedValue({ active: null, history: [] })
})

describe('outdoor screen', () => {
  it('starts the selected sport only after the user clicks', async () => {
    open()
    fireEvent.click(await screen.findByLabelText('Ciclismo'))
    expect(outdoorActivity.start).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar ciclismo' }))
    await waitFor(() => expect(outdoorActivity.start).toHaveBeenCalledWith('account-a', 'cycling'))
  })
  it('shows a recovered activity and resumes using its original sport', async () => {
    outdoorActivity.read.mockResolvedValue({ active, history: [] })
    open()
    expect(await screen.findByText('Gravação interrompida')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retomar' }))
    await waitFor(() => expect(outdoorActivity.start).toHaveBeenCalledWith('account-a', 'running'))
  })
  it('retains activity controls and exposes a failed save', async () => {
    outdoorActivity.read.mockResolvedValue({ active, history: [] })
    outdoorActivity.finish.mockRejectedValue(new Error('Sem espaço no aparelho'))
    open()
    fireEvent.click(await screen.findByRole('button', { name: 'Finalizar e salvar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem espaço no aparelho')
    expect(screen.getByRole('button', { name: 'Retomar' })).toBeInTheDocument()
  })
  it('requires explicit confirmation before deleting a saved route', async () => {
    outdoorActivity.read.mockResolvedValue({ active: null, history: [{ ...active, startedAt: 10000 }] })
    outdoorActivity.detail.mockResolvedValue({ ...active, startedAt: 10000 })
    open()
    fireEvent.click(await screen.findByRole('button', { name: /Corrida.*1 km/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir esta atividade' }))
    expect(outdoorActivity.delete).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))
    await waitFor(() => expect(outdoorActivity.delete).toHaveBeenCalledWith('account-a', 'route-a'))
  })
  it('does not request GPS on the website', async () => {
    outdoorActivity.available.mockReturnValue(false)
    open()
    expect(screen.getByRole('link', { name: 'Baixar aplicativo Android' })).toHaveAttribute('href', '/download')
    expect(outdoorActivity.read).not.toHaveBeenCalled()
    expect(outdoorActivity.start).not.toHaveBeenCalled()
  })
})
