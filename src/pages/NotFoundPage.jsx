import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--bg)' }}>
      <div className="mb-8">
        <div className="font-display text-9xl leading-none mb-2"
          style={{ color: 'rgba(130,10,209,.15)', fontSize: 160 }}>404</div>
        <div className="w-16 h-16 rounded-2xl mx-auto -mt-12 flex items-center justify-center mb-6"
          style={{ background: 'rgba(130,10,209,.1)', border: '1px solid rgba(130,10,209,.25)' }}>
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
      </div>
      <h1 className="font-display text-4xl uppercase tracking-wide mb-3"
        style={{ color: 'var(--text-1)' }}>
        Página não encontrada
      </h1>
      <p className="text-base mb-8 max-w-sm"
        style={{ color: 'var(--text-3)' }}>
        Esta página não existe ou foi movida. Que tal voltar para o início?
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <button onClick={() => navigate(-1)}
          className="f-btn f-btn-ghost px-6 py-3">
          ← Voltar
        </button>
        <Link to="/" className="f-btn f-btn-accent px-6 py-3">
          Ir para o início
        </Link>
      </div>
      <p className="text-xs mt-12" style={{ color: 'var(--text-3)' }}>
        Se acredita que isso é um erro,{' '}
        <a href="mailto:suporte@vorynapp.com.br" style={{ color: 'var(--accent-2)' }}>
          fale com o suporte
        </a>
      </p>
    </div>
  )
}
