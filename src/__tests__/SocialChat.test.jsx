import React from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import SocialChat from '@/components/SocialChat'
import { communityService, friendService } from '@/services'
import { socialProfiles } from '@/services/socialProfiles'

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'me' }, profile: { name: 'Ana' } }) }))
vi.mock('@/services', () => ({ communityService: { getMessages: vi.fn(), subscribeMessages: vi.fn(), sendMessage: vi.fn() }, friendService: { getMessages: vi.fn(), subscribeMessages: vi.fn(), sendMessage: vi.fn() } }))
vi.mock('@/services/socialProfiles', () => ({ socialProfiles: { get: vi.fn(), photoUrl: vi.fn() } }))
const message = { id: 'one', user_id: 'friend', content: 'Bora treinar?', created_at: '2026-10-23T12:00:00Z' }
beforeEach(() => {
  vi.clearAllMocks()
  communityService.getMessages.mockResolvedValue({ data: [message] })
  communityService.subscribeMessages.mockReturnValue({ unsubscribe: vi.fn() })
  friendService.getMessages.mockResolvedValue({ data: [] })
  friendService.subscribeMessages.mockReturnValue({ unsubscribe: vi.fn() })
  socialProfiles.get.mockResolvedValue([{ id: 'friend', name: 'Bruno', avatar_url: 'friend/photo.jpg' }])
  socialProfiles.photoUrl.mockResolvedValue('https://example.com/photo.jpg')
})
afterEach(cleanup)
it('identifica o autor com nome e foto, mesmo sem a lista de membros', async () => {
  render(<SocialChat communityId="group" />)
  expect(await screen.findByText('Bruno')).toBeInTheDocument()
  expect(await screen.findByAltText('Foto de Bruno')).toBeInTheDocument()
  expect(screen.getByText('Bora treinar?')).toBeInTheDocument()
  expect(document.querySelector('time')).toHaveAttribute('datetime', '2026-10-23T12:00:00.000Z')
})
it('mantém o rascunho quando há falha no envio', async () => {
  communityService.sendMessage.mockResolvedValue({ error: new Error('offline') })
  render(<SocialChat communityId="group" />)
  await screen.findByText('Bora treinar?')
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Vamos!' } })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Mensagem não enviada')
  expect(screen.getByRole('textbox')).toHaveValue('Vamos!')
})
it('deduplica o retorno do envio e o evento Realtime', async () => {
  const sent = { ...message, id: 'sent', user_id: 'me', content: 'Confirmado' }
  communityService.sendMessage.mockImplementation(async () => {
    communityService.subscribeMessages.mock.calls[0][1](sent)
    return { data: sent }
  })
  render(<SocialChat communityId="group" />)
  await screen.findByText('Bora treinar?')
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Confirmado' } })
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }))
  await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''))
  expect(screen.getAllByText('Confirmado')).toHaveLength(1)
})
it('preserva mensagens recebidas durante o carregamento do histórico', async () => {
  let resolve
  communityService.getMessages.mockReturnValue(new Promise(done => { resolve = done }))
  render(<SocialChat communityId="group" />)
  act(() => communityService.subscribeMessages.mock.calls[0][1]({ ...message, id: 'new', content: 'Cheguei agora' }))
  await act(async () => resolve({ data: [message] }))
  expect(screen.getByText('Cheguei agora')).toBeInTheDocument()
  expect(screen.getByText('Bora treinar?')).toBeInTheDocument()
})
it('usa a conversa privada e encerra a inscrição ao sair', async () => {
  const unsubscribe = vi.fn()
  friendService.subscribeMessages.mockReturnValue({ unsubscribe })
  const view = render(<SocialChat friendId="friend" friendName="Bruno" />)
  await screen.findByText('Comece a conversa. Envie uma mensagem!')
  expect(friendService.getMessages).toHaveBeenCalledWith('me', 'friend')
  view.unmount()
  expect(unsubscribe).toHaveBeenCalledOnce()
})
