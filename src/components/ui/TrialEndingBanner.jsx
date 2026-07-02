import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

// Antes, não existia NENHUM aviso de "seu trial está acabando" em lugar
// nenhum do produto — nem email, nem push, nem banner no app. O trial
// simplesmente expirava e a pessoa era jogada no PaywallGate sem aviso
// prévio. Este banner é a camada mais confiável das três (email e push
// dependem de um cron configurado manualmente no painel do Supabase — ver
// SETUP.md — que é fácil de esquecer ou configurar errado; este banner
// não depende de nada externo, só do próprio profile já carregado).
//
// Mostra nos últimos TRIAL_WARNING_DAYS dias do trial, de forma discreta
// (não bloqueia o uso do app, diferente do PaywallGate). Dispensável por
// dia: se a pessoa fechar, não aparece de novo até o dia seguinte — mas
// volta a aparecer todo dia até o trial acabar ou ela assinar, porque
// diferente do aviso de instalação do iOS, este é sobre algo com prazo
// real que efetivamente vai bloquear o acesso.

const TRIAL_WARNING_DAYS = 3

function todayKey() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

export default function TrialEndingBanner({ hidden = false }) {
  const { subStatus, daysUntilTrialEnd } = useAuth()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  const shouldShow =
    !hidden &&
    subStatus === 'trialing' &&
    daysUntilTrialEnd !== null &&
    daysUntilTrialEnd >= 0 &&
    daysUntilTrialEnd <= TRIAL_WARNING_DAYS

  useEffect(() => {
    if (!shouldShow) return
    const key = `voryn_trial_banner_dismissed_${todayKey()}`
    setDismissed(localStorage.getItem(key) === '1')
  }, [shouldShow])

  if (!shouldShow || dismissed) return null

  function handleDismiss() {
    localStorage.setItem(`voryn_trial_banner_dismissed_${todayKey()}`, '1')
    setDismissed(true)
  }

  const label = daysUntilTrialEnd === 0
    ? 'Seu trial acaba hoje'
    : `Seu trial acaba em ${daysUntilTrialEnd} dia${daysUntilTrialEnd !== 1 ? 's' : ''}`

  return (
    <div className="mx-4 mt-4 flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: 'rgba(var(--accent-rgb),.1)', border: '1px solid rgba(var(--accent-rgb),.3)' }}>
      <span className="text-lg flex-shrink-0">⏳</span>
      <button onClick={() => navigate('/app/subscription')} className="flex-1 text-left">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{label}</p>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>Toque para assinar e manter seu histórico</p>
      </button>
      <button onClick={handleDismiss} aria-label="Dispensar"
        className="flex-shrink-0 p-1" style={{ color: 'var(--text-3)' }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  )
}
