import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

const ToastContext = createContext(null)

const ICONS = {
  success: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  error: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  info: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  loading: (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  ),
}

const STYLES = {
  success: { bg: 'rgba(74,222,128,.12)', border: 'rgba(74,222,128,.3)', color: '#4ade80' },
  error:   { bg: 'rgba(248,113,113,.12)', border: 'rgba(248,113,113,.3)', color: '#f87171' },
  info:    { bg: 'rgba(var(--accent-rgb),.12)', border: 'rgba(var(--accent-rgb),.3)', color: '#A855F7' },
  loading: { bg: 'rgba(var(--accent-rgb),.12)', border: 'rgba(var(--accent-rgb),.3)', color: '#A855F7' },
}

function ToastItem({ toast, onRemove }) {
  const [visible, setVisible] = useState(false)
  const s = STYLES[toast.type] || STYLES.info

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    if (toast.type !== 'loading' && toast.duration !== Infinity) {
      const t = setTimeout(() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300) }, toast.duration || 3000)
      return () => clearTimeout(t)
    }
  }, [])

  return (
    <div
      onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 300) }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 12,
        padding: '12px 16px',
        minWidth: 240, maxWidth: 340,
        backdropFilter: 'blur(12px)',
        cursor: 'pointer',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(.95)',
        opacity: visible ? 1 : 0,
        transition: 'all .28s cubic-bezier(.34,1.56,.64,1)',
        boxShadow: '0 8px 32px rgba(0,0,0,.35)',
      }}
    >
      <span style={{ color: s.color, flexShrink: 0 }}>{ICONS[toast.type]}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', flex: 1, lineHeight: 1.4 }}>
        {toast.message}
      </span>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'info', duration) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, message, type, duration }])
    return id
  }, [])

  const remove = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const api = {
    success: (msg, dur) => toast(msg, 'success', dur),
    error:   (msg, dur) => toast(msg, 'error', dur || 4000),
    info:    (msg, dur) => toast(msg, 'info', dur),
    loading: (msg)      => toast(msg, 'loading', Infinity),
    dismiss: remove,
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div style={{
        position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999,
        pointerEvents: 'none', alignItems: 'center',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'all' }}>
            <ToastItem toast={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
