import React, { useState } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function AuthRecoveryScreen() {
  const { user, authError, refreshProfile, signOut } = useAuth()
  const [error, setError] = useState('')
  const [leaving, setLeaving] = useState(false)
  async function leave() {
    setLeaving(true)
    setError('')
    try { await signOut() }
    catch (err) { setError(err.message) }
    finally { setLeaving(false) }
  }
  return <main className="min-h-dvh flex items-center justify-center px-6" style={{ background: 'var(--bg)', color: 'var(--text-1)' }}>
    <div className="f-card p-6 max-w-md space-y-4 text-center">
      <img src="/voryn-logo-purple.png" alt="Voryn" className="w-16 h-16 rounded-2xl mx-auto" />
      <h1 className="text-xl font-semibold">Não foi possível abrir sua conta</h1>
      <p role="alert" className="text-sm" style={{ color: 'var(--text-2)' }}>{authError || 'Não conseguimos carregar seu perfil. Tente novamente.'}</p>
      <button className="f-btn f-btn-accent w-full" disabled={leaving} onClick={() => user ? refreshProfile() : window.location.reload()}>Tentar novamente</button>
      {user && <button className="f-btn f-btn-ghost w-full" disabled={leaving} onClick={leave}>{leaving ? 'Saindo…' : 'Sair da conta'}</button>}
      {error && <p role="alert" className="text-sm">{error}</p>}
    </div>
  </main>
}
