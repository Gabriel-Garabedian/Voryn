import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { pushService } from '@/services/pushNotifications'

export default function NotificationPrompt({ onDismiss }) {
  const { user } = useAuth()
  const [state, setState] = useState('idle') // idle | requesting | granted | denied

  useEffect(() => {
    if (!pushService.isSupported()) { onDismiss?.(); return }
    if (Notification.permission !== 'default') { onDismiss?.(); return }
  }, [])

  async function handleEnable() {
    setState('requesting')
    const result = await pushService.subscribe(user?.id)
    if (result.error === 'denied' || result.error === 'not_supported') {
      setState('denied')
      setTimeout(onDismiss, 2000)
    } else {
      setState('granted')
      setTimeout(onDismiss, 1800)
    }
  }

  if (state === 'granted') return (
    <div className="f-card mx-4 p-4 flex items-center gap-3 animate-slide-up"
      style={{ borderColor:'rgba(74,222,128,.3)', background:'rgba(74,222,128,.06)' }}>
      <span className="text-2xl">🔔</span>
      <p className="text-sm font-semibold" style={{ color:'#4ade80' }}>
        Notificações ativadas! Vamos te lembrar de treinar. 💪
      </p>
    </div>
  )

  if (state === 'denied') return (
    <div className="f-card mx-4 p-4 flex items-center gap-3"
      style={{ borderColor:'rgba(248,113,113,.2)' }}>
      <span className="text-xl">😔</span>
      <p className="text-sm" style={{ color:'var(--text-3)' }}>
        Sem problema. Você pode ativar nas configurações do navegador depois.
      </p>
    </div>
  )

  return (
    <div className="f-card mx-4 p-4 animate-slide-up"
      style={{ borderColor:'rgba(var(--accent-rgb),.3)', background:'rgba(var(--accent-rgb),.04)' }}>
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background:'rgba(var(--accent-rgb),.12)', border:'1px solid rgba(var(--accent-rgb),.25)' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="2">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold" style={{ color:'var(--text-1)' }}>
            Ativar lembretes de treino?
          </p>
          <p className="text-xs mt-0.5" style={{ color:'var(--text-3)' }}>
            Receba notificações para manter sua sequência e não perder treinos.
          </p>
        </div>
        <button onClick={onDismiss} style={{ color:'var(--text-3)', flexShrink:0 }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div className="flex gap-2">
        <button onClick={handleEnable} disabled={state === 'requesting'}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background:'var(--accent)', opacity: state==='requesting' ? .7 : 1 }}>
          {state === 'requesting' ? 'Ativando...' : '🔔 Ativar notificações'}
        </button>
        <button onClick={onDismiss}
          className="px-4 py-2.5 rounded-xl text-sm"
          style={{ background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text-3)' }}>
          Agora não
        </button>
      </div>
    </div>
  )
}
