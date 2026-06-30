import React, { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { PLANS, createCheckoutSession, redirectToCheckout } from '@/services/payment'
import { captureError } from '@/lib/sentry'
import { Button } from '@/components/ui'

export default function CheckoutPage() {
  const { planId }   = useParams()
  const { user, profile } = useAuth()
  const navigate     = useNavigate()
  const plan         = PLANS[planId]
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  if (!plan) return <div className="p-10 text-center" style={{ color: 'var(--text-3)' }}>Plano não encontrado.</div>

  async function handleCheckout() {
    if (!user) { navigate(`/register?redirect=/checkout/${planId}`); return }
    setLoading(true); setError('')
    try {
      const { init_point, error: mpErr } = await createCheckoutSession({
        planId,
        userName: profile?.name || user.email,
      })
      if (mpErr) throw new Error(mpErr)
      redirectToCheckout(init_point)
    } catch (e) {
      captureError(e, { context: 'checkout', planId, userId: user?.id })
      setError(e.message || 'Erro ao iniciar pagamento. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md animate-slide-up">
        <Link to="/pricing" className="flex items-center gap-2 text-sm mb-6" style={{ color: 'var(--text-3)' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          Voltar
        </Link>

        <div className="f-card p-6" style={plan.highlight ? { borderColor: 'var(--accent)' } : {}}>
          {/* Plan summary */}
          <div className="text-center mb-6 pb-6" style={{ borderBottom: '1px solid var(--border)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>
              Você escolheu
            </p>
            <h2 className="font-display text-3xl uppercase tracking-wide mb-2" style={{ color: 'var(--text-1)' }}>
              {plan.name}
            </h2>
            <div className="flex items-end justify-center gap-1">
              <span className="font-display text-5xl" style={{ color: 'var(--accent)' }}>
                R${plan.price.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-sm mb-2" style={{ color: 'var(--text-3)' }}>/mês</span>
            </div>
            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs"
              style={{ background: 'rgba(74,222,128,.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,.2)' }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              14 dias grátis incluídos
            </div>
          </div>

          {/* Features */}
          <ul className="space-y-2 mb-6">
            {plan.features.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--accent-2)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                {f}
              </li>
            ))}
          </ul>

          {error && (
            <div className="mb-4 text-sm rounded-xl px-4 py-3"
              style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', color: '#f87171' }}>
              {error}
            </div>
          )}

          <Button size="xl" loading={loading} onClick={handleCheckout}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            Ir para pagamento
          </Button>

          <p className="text-center text-xs mt-4" style={{ color: 'var(--text-3)' }}>
            Pagamento seguro via Mercado Pago · Cancele quando quiser
          </p>
        </div>
      </div>
    </div>
  )
}
