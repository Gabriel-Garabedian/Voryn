import React from 'react'
import { Link } from 'react-router-dom'
import { MEDIA_CREDITS } from '@/data/mediaCredits'

// Tela de créditos do app. A fonte é public/media/credits.json (via
// src/data/mediaCredits.js): se um arquivo novo entrar no catálogo, ele
// aparece aqui sem ninguém precisar lembrar de atualizar esta página.
export default function CreditsPage() {
  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="flex items-center gap-2 text-sm mb-10" style={{ color: 'var(--text-3)' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          Voltar
        </Link>

        <h1 className="font-display text-3xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
          Créditos de mídia
        </h1>
        <p className="text-sm mt-2 mb-8" style={{ color: 'var(--text-3)' }}>
          As fotografias e os vídeos usados no Voryn vêm do Wikimedia Commons, sob licença livre.
          Cada item abaixo lista o autor original, a licença e a página-fonte.
        </p>

        <ul className="space-y-3">
          {MEDIA_CREDITS.map(c => (
            <li key={c.file} className="f-card p-4">
              <div className="flex items-start gap-4">
                {c.media === 'image' && (
                  <img src={c.path} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                    style={{ background: 'var(--surface)' }} />
                )}
                {c.media === 'video' && c.poster && (
                  <img src={c.poster} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                    style={{ background: 'var(--surface)' }} />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{c.title}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-2)' }}>
                    {c.creator} ·{' '}
                    <a href={c.licenseUrl} target="_blank" rel="noreferrer noopener"
                      style={{ color: 'var(--accent-text)' }}>
                      {c.license}
                    </a>
                  </p>
                  <a href={c.page} target="_blank" rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-xs mt-1.5"
                    style={{ color: 'var(--text-3)', textDecoration: 'none' }}>
                    Ver no Wikimedia Commons
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6"/>
                    </svg>
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="text-xs mt-6" style={{ color: 'var(--text-3)', lineHeight: 1.6 }}>
          Imagens marcadas como domínio público não exigem crédito, mas o autor é listado
          por honestidade. Materiais sob CC BY-SA exigem que versões alteradas continuem
          sob a mesma licença.
        </p>
      </div>
    </div>
  )
}
