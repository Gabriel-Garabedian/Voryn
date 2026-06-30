import React from 'react'
import { Link } from 'react-router-dom'
import { PLANS } from '@/services/payment'

function Check() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--accent-2)', flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

export default function PricingPage() {
  const plans = Object.values(PLANS)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link to="/" className="font-display text-2xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
          VORYN
        </Link>
        <Link to="/login" className="f-btn f-btn-ghost py-2 px-4 text-sm">Entrar</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--accent-2)' }}>
          Planos e Preços
        </p>
        <h1 className="font-display text-5xl md:text-7xl uppercase tracking-wide mb-4" style={{ color: 'var(--text-1)' }}>
          ESCOLHA SEU PLANO
        </h1>
        <p className="text-lg mb-3" style={{ color: 'var(--text-3)' }}>
          14 dias grátis em todos os planos. Cancele quando quiser.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-16"
          style={{ background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.2)', color: '#4ade80' }}>
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block"/>
          14 dias grátis — sem cartão de crédito
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 text-left">
          {plans.map(plan => (
            <div key={plan.id}
              className="f-card p-6 flex flex-col relative"
              style={plan.highlight ? {
                borderColor: 'var(--accent)',
                boxShadow: '0 0 30px rgba(130,10,209,.2)',
              } : {}}>

              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
                  style={{ background: 'var(--accent)' }}>
                  Mais popular
                </div>
              )}

              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>
                  {plan.description}
                </p>
                <h3 className="font-display text-2xl uppercase tracking-wide mb-3" style={{ color: 'var(--text-1)' }}>
                  {plan.name}
                </h3>
                <div className="flex items-end gap-1">
                  <span className="font-display text-5xl" style={{ color: plan.highlight ? 'var(--accent)' : 'var(--text-1)' }}>
                    R${plan.price.toFixed(2).replace('.',',')}
                  </span>
                  <span className="text-sm mb-2" style={{ color: 'var(--text-3)' }}>/{plan.period}</span>
                </div>
                {plan.maxStudents > 0 && (
                  <p className="text-sm mt-1" style={{ color: 'var(--accent-2)' }}>
                    Até {plan.maxStudents} alunos
                  </p>
                )}
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                    <Check />
                    {f}
                  </li>
                ))}
              </ul>

              <Link to={`/checkout/${plan.id}`}
                className="f-btn text-sm font-semibold py-3 px-6 rounded-xl text-center w-full"
                style={plan.highlight
                  ? { background: 'var(--accent)', color: '#fff', boxShadow: '0 0 20px rgba(130,10,209,.35)' }
                  : { background: 'var(--surface)', color: 'var(--text-1)', border: '1px solid var(--border)' }}>
                Começar grátis
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ quick */}
        <div className="mt-20 max-w-2xl mx-auto text-left space-y-4">
          <h2 className="font-display text-3xl uppercase tracking-wide text-center mb-8" style={{ color: 'var(--text-1)' }}>
            DÚVIDAS RÁPIDAS
          </h2>
          {[
            ['Posso cancelar quando quiser?', 'Sim, sem multa e sem burocracia. Cancele pelo próprio app.'],
            ['O que acontece após o período de teste?', 'Você será notificado antes do vencimento. Se não assinar, o acesso é limitado.'],
            ['Os dados ficam seguros?', 'Sim. Utilizamos Supabase com criptografia e Row Level Security — seus dados só são acessíveis por você.'],
            ['Posso mudar de plano?', 'Sim, a qualquer momento. O ajuste é proporcional ao período restante.'],
          ].map(([q, a]) => (
            <div key={q} className="f-card p-4">
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-1)' }}>{q}</p>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
