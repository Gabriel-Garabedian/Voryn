import React, { useState, useMemo, useRef, useEffect } from 'react'
import { searchExercises, MUSCLE_GROUPS, EXERCISE_LIBRARY } from '@/data/exercises'
import ExerciseDetail from '@/components/ExerciseDetail'

const AC = 'var(--accent)'

const TYPE_LABEL = { compound: 'Composto', isolation: 'Isolado', cardio: 'Cardio' }
const TYPE_COLOR = {
  compound:  { bg: 'rgba(var(--accent-rgb),.1)',  color: '#A855F7' },
  isolation: { bg: 'rgba(74,222,128,.08)', color: '#4ade80' },
  cardio:    { bg: 'rgba(248,113,113,.1)', color: '#f87171' },
}

export default function ExercisePicker({ onSelect, onClose, onCustom }) {
  const [query,  setQuery]  = useState('')
  const [muscle, setMuscle] = useState('')
  const [detailExercise, setDetailExercise] = useState(null) // exercício aberto no modal de instruções
  const inputRef = useRef(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 120) }, [])

  const results = useMemo(() => searchExercises(query, muscle), [query, muscle])

  function handleAddFromDetail(exercise) {
    setDetailExercise(null)
    onSelect(exercise)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={onClose} style={{ color: 'var(--text-3)', flexShrink: 0 }}>
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="16" height="16"
            fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            className="f-input pl-9 py-2.5 text-sm"
            placeholder="Buscar exercício..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)' }}>
          {results.length}
        </span>
      </div>

      {/* Muscle filter chips */}
      <div className="flex gap-2 px-4 py-2.5 overflow-x-auto"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', scrollbarWidth: 'none' }}>
        <button
          onClick={() => setMuscle('')}
          className="px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all"
          style={{
            background: !muscle ? AC : 'var(--card)',
            color:      !muscle ? '#fff' : 'var(--text-3)',
            border:     `1px solid ${!muscle ? AC : 'var(--border)'}`,
          }}>
          Todos
        </button>
        {MUSCLE_GROUPS.map(m => (
          <button key={m}
            onClick={() => setMuscle(m === muscle ? '' : m)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 transition-all"
            style={{
              background: muscle === m ? AC : 'var(--card)',
              color:      muscle === m ? '#fff' : 'var(--text-3)',
              border:     `1px solid ${muscle === m ? AC : 'var(--border)'}`,
            }}>
            {m}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
        {/* Custom exercise option */}
        {query.trim().length > 0 && (
          <button
            onClick={() => onCustom?.(query.trim()) ?? onSelect({ id: `custom_${Date.now()}`, name: query.trim(), muscle: 'Outro', equipment: 'Livre', type: 'compound' })}
            className="w-full f-card p-3 flex items-center gap-3 transition-all text-left"
            style={{ borderStyle: 'dashed', borderColor: 'rgba(var(--accent-rgb),.35)' }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(var(--accent-rgb),.1)', border: '1px solid rgba(var(--accent-rgb),.25)' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={AC} strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: AC }}>
                Adicionar "{query.trim()}"
              </p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Exercício personalizado</p>
            </div>
          </button>
        )}

        {results.length === 0 && query.trim() === '' && (
          <p className="text-center text-sm py-8" style={{ color: 'var(--text-3)' }}>
            Nenhum exercício encontrado.
          </p>
        )}

        {results.map(ex => {
          const tc = TYPE_COLOR[ex.type] || TYPE_COLOR.compound
          return (
            <div key={ex.id}
              className="w-full f-card p-3 flex items-center gap-3 transition-all text-left"
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <button onClick={() => setDetailExercise(ex)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(var(--accent-rgb),.08)', border: '1px solid rgba(var(--accent-rgb),.15)' }}>
                  <span className="text-lg">
                    {ex.muscle === 'Peito' ? '🫀' : ex.muscle === 'Costas' ? '🏋️' :
                     ex.muscle === 'Pernas' ? '🦵' : ex.muscle === 'Ombro' ? '💪' :
                     ex.muscle === 'Bíceps' ? '💪' : ex.muscle === 'Tríceps' ? '💪' :
                     ex.muscle === 'Abdômen' ? '⚡' : ex.muscle === 'Glúteo' ? '🍑' :
                     ex.muscle === 'Cardio' ? '❤️' : ex.muscle === 'Funcional' ? '⚙️' : '🏃'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>
                    {ex.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>{ex.muscle}</span>
                    <span style={{ color: 'var(--border)' }}>·</span>
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>{ex.equipment}</span>
                  </div>
                </div>
              </button>
              <span className="text-xs px-2 py-1 rounded-full flex-shrink-0 hidden sm:inline-block"
                style={{ background: tc.bg, color: tc.color }}>
                {TYPE_LABEL[ex.type] || ex.type}
              </span>
              <button onClick={() => onSelect(ex)}
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                style={{ background: 'rgba(var(--accent-rgb),.1)', color: AC, border: '1px solid rgba(var(--accent-rgb),.2)' }}
                title="Adicionar direto, sem ver instruções">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>
          )
        })}
      </div>

      {/* Modal de instruções de execução */}
      {detailExercise && (
        <ExerciseDetail
          exercise={detailExercise}
          onAdd={handleAddFromDetail}
          onClose={() => setDetailExercise(null)}
        />
      )}
    </div>
  )
}
