import React, { useId, useRef } from 'react'
import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useDialogA11y } from '@/components/ui/useDialogA11y'
import { dialogMotion, motionTiming } from '@/utils/motion'

// ── Button ─────────────────────────────────────────────────
// A ação primária é feita primária por INVERSÃO (pílula clara com tinta
// quase preta); a cor da marca fica reservada aos dados. O feedback de
// pressão é o do Apple HIG: escala .97, sem salto.
export function Button({ children, variant='accent', size='md', className, loading, ...props }) {
  const base = 'f-btn'
  const variants = {
    accent:  'f-btn-accent',
    ghost:   'f-btn-ghost',
    danger:  'f-btn-danger',
    outline: 'f-btn-ghost',
  }
  const sizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-base w-full',
  }
  return (
    <button
      className={clsx(base, variants[variant] || variants.accent, sizes[size] || sizes.md, 'disabled:opacity-50 disabled:cursor-not-allowed', className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <svg className="animate-spin w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
  const generatedId = useId()
  const inputId = props.id || `input-${generatedId.replace(/:/g, '')}`
  const errorId = error ? `${inputId}-error` : undefined
  return (
    <div className="space-y-1.5">
      {label && <label className="f-label" htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errorId}
        className={clsx('f-input', error && 'border-[var(--danger)]', className)}
        {...props}
      />
      {error && <p id={errorId} role="alert" className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  )
}

// ── Card ───────────────────────────────────────────────────
export function Card({ children, className, ...props }) {
  return <div className={clsx('f-card f-module p-5', className)} {...props}>{children}</div>
}

// ── Badge ──────────────────────────────────────────────────
// Pílula de estado. Sem vidro: a separação vem do fundo tingido e da
// borda da própria cor.
export function Badge({ children, variant='accent', className }) {
  return <span className={clsx('f-badge', `f-badge-${variant}`, className)}>{children}</span>
}

// ── Modal ──────────────────────────────────────────────────
// Overlay escuro chapado, painel opaco um degrau acima do chão. O título
// é uma frase em caixa normal na fonte de texto — a display entra nos
// números, não no cabeçalho.
export function Modal({ open, onClose, title, children, size = 'md' }) {
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }
  const titleId = useId().replace(/:/g, '')
  const dialogRef = useRef(null)
  const reducedMotion = useReducedMotion()

  useDialogA11y(open, onClose, dialogRef)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.72)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: reducedMotion ? 0.08 : motionTiming.quick } }}
          transition={{ duration: reducedMotion ? 0.1 : motionTiming.standard }}
          onClick={e => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            ref={dialogRef}
            className={clsx('f-card w-full p-6', sizes[size])}
            {...dialogMotion(reducedMotion)}
          >
            {title && (
              <div className="flex items-center justify-between mb-5 pb-4"
                style={{ borderBottom: '1px solid var(--rule)' }}>
                <h3 id={titleId} className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>{title}</h3>
                <button type="button" aria-label="Fechar janela" onClick={onClose} className="icon-btn" style={{ color: 'var(--text-3)' }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
// `icon` recebe um nó (um SVG, normalmente) e é renderizado como marca
// desenhada, sem caixa tingida: a tela vazia se lê pelo que diz, não por
// um ladrilho colorido. Passar texto solto aqui vira palavra na tela.
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="f-card f-empty-state p-10 text-center flex flex-col items-center gap-3">
      {icon && <div className="f-empty-mark mb-1" aria-hidden="true">{icon}</div>}
      <p className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>{title}</p>
      {description && <p className="text-sm" style={{ color: 'var(--text-3)' }}>{description}</p>}
      {action}
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

// ── Chevron ────────────────────────────────────────────────
// Seta de navegação no traço do SF Symbols, e não o glifo "→" de
// texto: o caractere muda de desenho entre plataformas, não fica
// alinhado com a linha ao lado e some do leitor de tela com o
// announce do link. Aqui o SVG é decorativo (aria-hidden) e o
// texto do link é o que se lê.
export function Chevron({ direction = 'right', size = 14, className, strokeWidth = 2, ...props }) {
  const paths = {
    right: 'M9 6l6 6-6 6',
    left:  'M15 18l-6-6 6-6',
    up:    'M18 15l-6-6-6 6',
    down:  'M6 9l6 6 6-6',
  }
  return (
    <svg
      width={size} height={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" focusable="false" className={className} {...props}
    >
      <path d={paths[direction] || paths.right}/>
    </svg>
  )
}

// ── Section header ─────────────────────────────────────────
// Sem "eyebrow" em caixa alta: o subtítulo é uma frase, o título é um
// cabeçalho de seção na fonte de texto.
export function SectionHeader({ eyebrow, title, sub }) {
  return (
    <div className="mb-4">
      {eyebrow && (
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-3)' }}>
          {eyebrow}
        </p>
      )}
      <h2 className="text-xl font-semibold" style={{ color: 'var(--text-1)' }}>{title}</h2>
      {sub && <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{sub}</p>}
    </div>
  )
}

// ── Stat card ──────────────────────────────────────────────
// O KPI é TIPOGRAFIA: o número é o dado, o rótulo é uma frase, e não há
// ladrilho de ícone colorido. Alinhamento à direita com algarismos
// tabulares para o número não pular quando o valor muda.
export function StatCard({ label, value, sub, icon, color = 'var(--text-1)' }) {
  return (
    <div className="f-card f-stat-card p-4 text-left">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-3xl leading-none" style={{ color }}>{value}</div>
          <div className="text-sm font-semibold mt-2" style={{ color: 'var(--text-2)' }}>{label}</div>
        </div>
        {icon && <span className="text-lg leading-none" style={{ color: 'var(--text-3)' }} aria-hidden="true">{icon}</span>}
      </div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</div>}
    </div>
  )
}
