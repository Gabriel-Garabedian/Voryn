import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import TrainingMusic from '@/components/TrainingMusic'
import { localMusicPlayer, readMusicDuration } from '@/services/localMusic'
const notifications = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
const fixture = vi.hoisted(() => ({ state: { userId: 'owner', track: { name: 'Treino.mp3', duration: 180, start: 0 }, loading: false, playing: false } }))
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => notifications }))
vi.mock('@/services/localMusic', async original => ({ ...await original(), readMusicDuration: vi.fn(), localMusicPlayer: { subscribe: () => () => {}, snapshot: () => fixture.state, load: vi.fn(), save: vi.fn(), play: vi.fn(), pause: vi.fn(), remove: vi.fn() } }))
beforeEach(() => { vi.clearAllMocks(); localMusicPlayer.save.mockResolvedValue(); readMusicDuration.mockResolvedValue(180) })
afterEach(cleanup)
const show = (compact = false) => render(<MemoryRouter><TrainingMusic compact={compact} /></MemoryRouter>)
it('salva o início escolhido para o arquivo local', async () => {
  show()
  fireEvent.change(screen.getByLabelText('Começar em (minutos:segundos)'), { target: { value: '1:20' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar música e trecho' }))
  await waitFor(() => expect(notifications.success).toHaveBeenCalled())
  expect(localMusicPlayer.save).toHaveBeenCalledWith('owner', expect.objectContaining({ name: 'Treino.mp3', start: 80 }))
})
it('recusa um trecho posterior ao fim e mantém o arquivo salvo', async () => {
  show()
  fireEvent.change(screen.getByLabelText('Começar em (minutos:segundos)'), { target: { value: '3:00' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar música e trecho' }))
  expect(localMusicPlayer.save).not.toHaveBeenCalled()
  expect(notifications.error).toHaveBeenCalled()
})
it('não anuncia sucesso se não conseguir armazenar', async () => {
  localMusicPlayer.save.mockRejectedValue(new Error('Sem espaço'))
  show(); fireEvent.click(screen.getByRole('button', { name: 'Salvar música e trecho' }))
  await waitFor(() => expect(notifications.error).toHaveBeenCalledWith('Sem espaço'))
  expect(notifications.success).not.toHaveBeenCalled()
})
it('lê um novo arquivo e salva a seleção em vez da música antiga', async () => {
  const view = show()
  const file = new File(['audio'], 'Nova.mp3', { type: 'audio/mpeg' })
  fireEvent.change(view.container.querySelector('input[type=file]'), { target: { files: [file] } })
  await screen.findByText('Nova.mp3 · 3:00')
  fireEvent.click(screen.getByRole('button', { name: 'Salvar música e trecho' }))
  await waitFor(() => expect(localMusicPlayer.save).toHaveBeenCalledWith('owner', expect.objectContaining({ blob: file, name: 'Nova.mp3', start: 0 })))
})
it('oferece reprodução da mesma música durante o treino', () => {
  show(true); fireEvent.click(screen.getByRole('button', { name: 'Tocar para a série' }))
  expect(localMusicPlayer.play).toHaveBeenCalledWith('owner')
})
