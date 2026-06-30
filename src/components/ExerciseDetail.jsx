import React from 'react'
import { getExerciseInstructions, getExerciseVideoSearchUrl } from '@/data/exerciseInstructions'

const AC = 'var(--accent)'

const MUSCLE_EMOJI = {
  'Peito': '🫀', 'Costas': '🏋️', 'Pernas': '🦵', 'Ombro': '💪',
  'Bíceps': '💪', 'Tríceps': '💪', 'Abdômen': '⚡', 'Glúteo': '🍑',
  'Cardio': '❤️', 'Funcional': '⚙️', 'Posterior': '🦵',
  'Panturrilha': '🦵', 'Antebraço': '✊', 'Mobilidade': '🤸',
}

export default function ExerciseDetail({ exercise, onAdd, onClose, buttonLabel = 'Adicionar ao treino' }) {
  const { setup, steps, caution } = getExerciseInstructions(exercise)
  const videoUrl = getExerciseVideoSearchUrl(exercise.name)

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(6px)' }}/>

      <div className="relative w-full max-w-2xl mx-auto slide-in-bottom"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: '24px 24px 0 0',
          border: '1px solid var(--border)',
          borderBottom: 'none',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
        }}>

        {/* Handle */}
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1 flex-shrink-0" style={{ background: 'var(--border)' }}/>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-3 pb-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
            style={{ background: 'rgba(var(--accent-rgb),.1)', border: '1px solid rgba(var(--accent-rgb),.2)' }}>
            {MUSCLE_EMOJI[exercise.muscle] || '🏃'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display text-lg uppercase tracking-wide leading-tight" style={{ color: 'var(--text-1)' }}>
              {exercise.name}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>{exercise.muscle}</span>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>{exercise.equipment}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-3)', flexShrink: 0 }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Vídeo — link de busca no YouTube (sempre atualizado) */}
          <a href={videoUrl} target="_blank" rel="noopener noreferrer"
            className="w-full f-card p-3.5 flex items-center gap-3 transition-all"
            style={{ borderColor: 'rgba(239,68,68,.25)', background: 'rgba(239,68,68,.04)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,68,68,.12)' }}>
              <svg width="18" height="18" fill="#ef4444" viewBox="0 0 24 24">
                <path d="M21.582 7.182a2.51 2.51 0 00-1.768-1.768C18.254 5 12 5 12 5s-6.254 0-7.814.414a2.51 2.51 0 00-1.768 1.768C2 8.742 2 12 2 12s0 3.258.418 4.818a2.51 2.51 0 001.768 1.768C5.746 19 12 19 12 19s6.254 0 7.814-.414a2.51 2.51 0 001.768-1.768C22 15.258 22 12 22 12s0-3.258-.418-4.818z" opacity=".15"/>
                <path d="M9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Ver vídeo de execução</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Busca no YouTube · abre em nova aba</p>
            </div>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>

          {/* Setup */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: AC }}>
              Posição inicial
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{setup}</p>
          </div>

          {/* Steps */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: AC }}>
              Execução
            </p>
            <div className="space-y-2.5">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-display text-xs"
                    style={{ background: 'var(--accent)', color: '#fff' }}>
                    {i + 1}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Caution */}
          <div className="f-card p-3.5 flex items-start gap-3"
            style={{ borderColor: 'rgba(250,204,21,.25)', background: 'rgba(250,204,21,.05)' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#facc15" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(250,204,21,.85)' }}>{caution}</p>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          <button onClick={() => onAdd(exercise)}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
            style={{ background: 'var(--accent)', boxShadow: '0 0 20px rgba(var(--accent-rgb),.35)' }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
