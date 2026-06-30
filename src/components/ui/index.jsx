import React from 'react'
import clsx from 'clsx'

// ── Button ─────────────────────────────────────────────────
export function Button({ children, variant='accent', size='md', className, loading, ...props }) {
  const base = 'f-btn'
  const variants = {
    accent:  'f-btn-accent',
    ghost:   'f-btn-ghost',
    danger:  'f-btn-danger',
    outline: 'border border-[var(--border)] text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent)]',
  }
  const sizes = {
    sm: 'py-1.5 px-3 text-xs rounded-lg',
    md: 'py-2.5 px-5 text-sm rounded-xl',
    lg: 'py-3.5 px-8 text-base rounded-xl',
    xl: 'py-4 px-10 text-lg rounded-xl w-full',
  }
  return (
    <button
      className={clsx(base, variants[variant], sizes[size], 'disabled:opacity-50 disabled:cursor-not-allowed', className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      )}
      {children}
    </button>
  )
}

// ── Input ──────────────────────────────────────────────────
export function Input({ label, error, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="f-label">{label}</label>}
      <input className={clsx('f-input', error && 'border-red-400 focus:border-red-400', className)} {...props} />
      {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}

// ── Card ───────────────────────────────────────────────────
export function Card({ children, className, ...props }) {
  return <div className={clsx('f-card p-4', className)} {...props}>{children}</div>
}

// ── Badge ──────────────────────────────────────────────────
export function Badge({ children, variant='accent', className }) {
  return <span className={clsx('f-badge', `f-badge-${variant}`, className)}>{children}</span>
}

// ── Modal ──────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={clsx('f-card w-full scale-in', sizes[size])}>
        {title && (
          <div className="flex items-center justify-between mb-4 pb-3"
            style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>{title}</h3>
            <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="f-card p-10 text-center flex flex-col items-center gap-3">
      {icon && <div className="text-4xl mb-1">{icon}</div>}
      <p className="font-semibold text-base" style={{ color: 'var(--text-1)' }}>{title}</p>
      {description && <p className="text-sm" style={{ color: 'var(--text-3)' }}>{description}</p>}
      {action}
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

// ── Section Header ─────────────────────────────────────────
export function SectionHeader({ eyebrow, title, sub }) {
  return (
    <div className="mb-4">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--accent-2)' }}>
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-2xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>{title}</h2>
      {sub && <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{sub}</p>}
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────
export function StatCard({ label, value, sub, icon }) {
  return (
    <div className="f-card p-4 text-center">
      {icon && <div className="text-2xl mb-1">{icon}</div>}
      <div className="font-display text-3xl leading-none" style={{ color: 'var(--accent)' }}>{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wider mt-1" style={{ color: 'var(--text-3)' }}>{label}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</div>}
    </div>
  )
}
