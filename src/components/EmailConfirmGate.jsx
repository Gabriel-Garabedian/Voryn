import React, { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui'

// Tela mostrada quando o usuário se cadastrou mas ainda não confirmou o
// email. Desde a correção do trigger handle_new_user, o trial de 14 dias
// só começa depois da confirmação — antes disso a assinatura fica com
// status 'inactive', o que cairia no PaywallGate genérico ("assine um
// plano"), mensagem completamente errada para quem só precisa checar a
// caixa de entrada. Esta tela existe separada para não confundir os dois
// casos.
export default function EmailConfirmGate({ onSignOut }) {
  const { user, resendConfirmation } = useAuth()
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleResend() {
    if (!user?.email || sending) return
    setSending(true)
    setError('')
    const { error: err } = await resendConfirmation(user.email)
    setSending(false)
    if (err) {
      setError('Não foi possível reenviar agora. Tente novamente em alguns instantes.')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 text-center"
      style={{ background: 'var(--bg)' }}>
      <div className="text-5xl mb-5">📬</div>
      <h1 className="font-display text-2xl uppercase tracking-wide mb-2" style={{ color: 'var(--text-1)' }}>
        Confirme seu email
      </h1>
      <p className="text-sm max-w-sm mb-1" style={{ color: 'var(--text-2)' }}>
        Enviamos um link de confirmação para
      </p>
      <p className="text-sm font-semibold max-w-sm mb-6" style={{ color: 'var(--accent)' }}>
        {user?.email}
      </p>
      <p className="text-xs max-w-sm mb-8" style={{ color: 'var(--text-3)' }}>
        Clique no link do email para liberar seus 14 dias grátis. Não esqueça de checar a caixa de spam.
      </p>

      <div className="w-full max-w-xs space-y-3">
        {sent ? (
          <p className="text-sm font-medium py-3" style={{ color: 'var(--accent)' }}>
            ✓ Email reenviado. Confira sua caixa de entrada.
          </p>
        ) : (
          <Button size="xl" className="w-full" onClick={handleResend} disabled={sending}>
            {sending ? 'Enviando...' : 'Reenviar email de confirmação'}
          </Button>
        )}
        {error && (
          <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>
        )}
        <button onClick={onSignOut}
          className="w-full text-center text-sm py-2 transition-colors"
          style={{ color: 'var(--text-3)' }}>
          Sair da conta
        </button>
      </div>
    </div>
  )
}
