import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ native: false, auth: {} }))
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => state.native } }))
vi.mock('@/context/AuthContext', () => ({ useAuth: () => state.auth }))
vi.mock('@/pages/LandingPage', () => ({ default: () => <h1>Landing pública</h1> }))
vi.mock('@/pages/LoginPage', () => ({ default: () => <h1>Entrar na conta</h1> }))
vi.mock('@/components/layout/AppShell', () => ({ default: () => <h1>Meu Voryn</h1> }))
vi.mock('@/components/ui/LoadingScreen', () => ({ default: () => <p>Recuperando sessão</p> }))
vi.mock('@/components/AuthRecoveryScreen', () => ({ default: () => <p>Recuperar acesso</p> }))
vi.mock('@/components/ui/IOSInstallBanner', () => ({ default: () => null }))
import App from '@/App'

beforeEach(() => { state.native = false; state.auth = { user: null, profile: null, loading: false, authError: '' } })
afterEach(cleanup)
const open = () => render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)

describe('application startup at root', () => {
  for (const native of [true, false]) {
    it(`opens the account for an existing ${native ? 'native' : 'web'} session`, async () => {
      state.native = native
      state.auth = { ...state.auth, user: { id: 'owner' }, profile: { id: 'owner', role: 'student' } }
      open()
      expect(await screen.findByRole('heading', { name: 'Meu Voryn' })).toBeInTheDocument()
      expect(screen.queryByText('Landing pública')).not.toBeInTheDocument()
    })
  }
  it('opens login when the installed app has no session', async () => {
    state.native = true; open()
    expect(await screen.findByRole('heading', { name: 'Entrar na conta' })).toBeInTheDocument()
  })
  it('keeps the public landing for anonymous website visitors', async () => {
    open()
    expect(await screen.findByRole('heading', { name: 'Landing pública' })).toBeInTheDocument()
  })
  it('waits for session restoration before choosing the destination', async () => {
    state.native = true; state.auth.loading = true
    const view = open()
    expect(screen.getByText('Recuperando sessão')).toBeInTheDocument()
    expect(screen.queryByText('Landing pública')).not.toBeInTheDocument()
    state.auth = { ...state.auth, loading: false, user: { id: 'owner' }, profile: { id: 'owner' } }
    view.rerender(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Meu Voryn' })).toBeInTheDocument()
  })
  it('shows recovery instead of a public landing when restoring the account fails', () => {
    state.auth.authError = 'Profile unavailable'; open()
    expect(screen.getByText('Recuperar acesso')).toBeInTheDocument()
  })
})
