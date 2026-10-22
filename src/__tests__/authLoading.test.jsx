import React from 'react'
import { render, screen, act, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
const mocks = vi.hoisted(() => ({ callback: null, insideAuthEvent: false, query: vi.fn(), getSession: vi.fn(), rpc: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: {
  auth: {
    getSession: mocks.getSession,
    onAuthStateChange: callback => { mocks.callback = callback; return { data: { subscription: { unsubscribe: vi.fn() } } } },
  },
  from: () => {
    if (mocks.insideAuthEvent) throw new Error('Supabase queried while auth callback holds lock')
    const builder = { select: () => builder, eq: () => builder, single: () => mocks.query() }
    return builder
  },
  rpc: mocks.rpc,
} }))
import { AuthProvider, useAuth } from '@/context/AuthContext'
const account = { id: 'student-a', email_confirmed_at: '2026-10-22T00:00:00Z' }
const profile = { id: 'student-a', role: 'student', subscriptions: { status: 'trialing', trial_ends_at: '2099-01-01' } }
function Status() {
  const auth = useAuth()
  return <><p>{auth.loading ? 'loading' : 'ready'}</p><p>{auth.profile?.id || 'no profile'}</p><p>{auth.authError}</p></>
}
async function emit(user, event = 'SIGNED_IN') {
  await act(async () => {
    mocks.insideAuthEvent = true
    try { mocks.callback(event, user ? { user } : null) }
    finally { mocks.insideAuthEvent = false }
  })
}
async function tick(ms = 0) { await act(async () => { await vi.advanceTimersByTimeAsync(ms) }) }
beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  localStorage.clear()
  mocks.getSession.mockResolvedValue({ data: { session: null } })
  mocks.query.mockResolvedValue({ data: profile, error: null })
  mocks.rpc.mockResolvedValue({ data: false, error: null })
})
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('authentication loading', () => {
  it('loads the student outside the auth callback and stays ready after token refresh', async () => {
    render(<AuthProvider><Status /></AuthProvider>)
    await tick()
    await emit(account)
    expect(mocks.query).not.toHaveBeenCalled()
    await tick()
    expect(screen.getByText('ready')).toBeInTheDocument()
    expect(screen.getByText('student-a')).toBeInTheDocument()
    await emit(account, 'TOKEN_REFRESHED')
    await tick()
    expect(screen.getByText('ready')).toBeInTheDocument()
    expect(mocks.query).toHaveBeenCalledTimes(1)
  })
  it('reports a missing or inaccessible profile instead of spinning forever', async () => {
    mocks.query.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    render(<AuthProvider><Status /></AuthProvider>)
    await tick(); await emit(account); await tick()
    expect(screen.getByText('ready')).toBeInTheDocument()
    expect(screen.getByText(/Seu login foi reconhecido/)).toBeInTheDocument()
  })
  it('stops loading when a profile request never responds', async () => {
    mocks.query.mockImplementation(() => new Promise(() => {}))
    render(<AuthProvider><Status /></AuthProvider>)
    await tick(); await emit(account); await tick(); await tick(20000)
    expect(screen.getByText('ready')).toBeInTheDocument()
    expect(screen.getByText(/Não foi possível concluir/)).toBeInTheDocument()
  })
  it('reports session retrieval timeouts', async () => {
    mocks.getSession.mockImplementation(() => new Promise(() => {}))
    render(<AuthProvider><Status /></AuthProvider>)
    await tick(20000)
    expect(screen.getByText('ready')).toBeInTheDocument()
    expect(screen.getByText(/Não foi possível recuperar/)).toBeInTheDocument()
  })
  it('does not block login on optional pending invitations', async () => {
    localStorage.setItem('voryn_pending_friend', 'invite')
    mocks.rpc.mockImplementation(name => name === 'connect_via_friend_code'
      ? new Promise(() => {}) : Promise.resolve({ data: false, error: null }))
    render(<AuthProvider><Status /></AuthProvider>)
    await tick(); await emit(account); await tick(); await tick(20000)
    expect(screen.getByText('ready')).toBeInTheDocument()
    expect(screen.getByText('student-a')).toBeInTheDocument()
    expect(screen.queryByText(/Não foi possível concluir/)).not.toBeInTheDocument()
  })
  it('does not restore an old profile after logout', async () => {
    let finish
    mocks.query.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    render(<AuthProvider><Status /></AuthProvider>)
    await tick(); await emit(account); await tick(); await emit(null, 'SIGNED_OUT')
    await act(async () => { finish({ data: profile, error: null }) })
    expect(screen.getByText('ready')).toBeInTheDocument()
    expect(screen.getByText('no profile')).toBeInTheDocument()
  })
})
