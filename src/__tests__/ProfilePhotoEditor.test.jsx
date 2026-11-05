import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ProfilePhotoEditor from '@/components/ProfilePhotoEditor'
import { socialProfiles } from '@/services/socialProfiles'
const state = vi.hoisted(() => ({ update: vi.fn(), success: vi.fn(), error: vi.fn() }))
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' }, profile: { name: 'Ana', avatar_url: 'owner/old.jpg' }, updateProfile: state.update }) }))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ success: state.success, error: state.error }) }))
vi.mock('@/services/socialProfiles', () => ({ socialProfiles: { upload: vi.fn(), remove: vi.fn(), photoUrl: vi.fn() } }))
beforeEach(() => {
  vi.clearAllMocks()
  socialProfiles.upload.mockResolvedValue('owner/new.jpg')
  socialProfiles.remove.mockResolvedValue()
  socialProfiles.photoUrl.mockResolvedValue('https://example.com/old.jpg')
  state.update.mockResolvedValue({ data: {} })
})
afterEach(cleanup)
it('remove apenas o upload novo quando salvar o perfil falha', async () => {
  state.update.mockResolvedValue({ error: new Error('offline') })
  const { container } = render(<ProfilePhotoEditor />)
  fireEvent.change(container.querySelector('input[type=file]'), { target: { files: [new File(['data'], 'photo.jpg', { type: 'image/jpeg' })] } })
  await waitFor(() => expect(state.error).toHaveBeenCalled())
  expect(socialProfiles.remove).toHaveBeenCalledWith('owner/new.jpg')
  expect(socialProfiles.remove).not.toHaveBeenCalledWith('owner/old.jpg')
  expect(state.success).not.toHaveBeenCalled()
})
it('troca a referência antes de limpar a foto antiga', async () => {
  const { container } = render(<ProfilePhotoEditor />)
  fireEvent.change(container.querySelector('input[type=file]'), { target: { files: [new File(['data'], 'photo.jpg', { type: 'image/jpeg' })] } })
  await waitFor(() => expect(state.success).toHaveBeenCalled())
  expect(state.update).toHaveBeenCalledWith({ avatar_url: 'owner/new.jpg' })
  expect(state.update.mock.invocationCallOrder[0]).toBeLessThan(socialProfiles.remove.mock.invocationCallOrder[0])
})
it('remove a referência e o arquivo ao excluir a foto', async () => {
  render(<ProfilePhotoEditor />)
  fireEvent.click(screen.getByRole('button', { name: 'Remover', exact: true }))
  await waitFor(() => expect(socialProfiles.remove).toHaveBeenCalledWith('owner/old.jpg'))
  expect(state.update).toHaveBeenCalledWith({ avatar_url: null })
})
