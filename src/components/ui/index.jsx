import React from 'react'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'

// ── Button ─────────────────────────────────────────────────
export function Button({ children, variant='accent', size='md', className, loading, ...props }) {
  const base = 'f-btn'
  const variants = {
    accent:  'f-btn-accent',
    ghost:   'f-btn-ghost',
    danger:  'f-btn-danger',
    outline: 'border border-[var(--border)] text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] bg-transparent',
  }
  const sizes = {
    sm: 'py-1.5 px-3 text-xs rounded-lg',
    md: 'py-2.5 px-5 text-sm rounded-xl',
    lg: 'py-3.5 px-8 text-base rounded-xl',
    xl: 'py-4 px-10 text-lg rounded-xl w-full',
  }
  return (
    <button
      className={clsx(base, variants[variant] || variants.accent, sizes[size] || sizes.md, 'disabled:opacity-50 disabled:cursor-not-allowed', className)}
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
  return <div className={clsx('f-card f-module p-5', className)} {...props}>{children}</div>
}

// ── Badge ──────────────────────────────────────────────────
export function Badge({ children, variant='accent', className }) {
  return <span className={clsx('f-badge', `f-badge-${variant}`, 'backdrop-blur-sm', className)}>{children}</span>
}

// ── Modal ──────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className={clsx('glass-panel w-full p-6', sizes[size])}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {title && (
              <div className="flex items-center justify-between mb-5 pb-4"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <h3 className="font-display text-2xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>{title}</h3>
                <button aria-label="Fechar" onClick={onClose} className="f-btn f-btn-ghost p-2 min-h-0">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Empty state ────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="glass-card f-empty-state p-10 text-center flex flex-col items-center gap-3">
      {icon && <div className="f-empty-mark w-14 h-14 flex items-center justify-center text-2xl mb-1" style={{ background: 'rgba(var(--accent-rgb),.12)', border: '1px solid rgba(var(--accent-rgb),.25)' }}>{icon}</div>}
      <p className="font-display text-2xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>{title}</p>
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
        <p className="text-xs font-semibold uppercase tracking-[.2em] mb-1" style={{ color: 'var(--accent-2)' }}>
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-3xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>{title}</h2>
      {sub && <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{sub}</p>}
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────
export function StatCard({ label, value, sub, icon }) {
  return (
    <div className="glass-card f-stat-card p-4 text-left">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-4xl leading-none" style={{ color: 'var(--accent)' }}>{value}</div>
          <div className="text-xs font-semibold uppercase tracking-wider mt-2" style={{ color: 'var(--text-3)' }}>{label}</div>
        </div>
        {icon && <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(var(--accent-rgb),.12)', border: '1px solid rgba(var(--accent-rgb),.25)' }}>{icon}</div>}
      </div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</div>}
    </div>
  )
}
