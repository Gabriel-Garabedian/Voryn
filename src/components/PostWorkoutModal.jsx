import React, { useEffect, useState } from 'react'
import { formatDuration, formatVolume, parseWeight } from '@/utils/helpers'

function StatBox({ label, value, highlight }) {
  return (
    <div className="f-card p-4 text-center" style={highlight ? { borderColor: 'var(--accent)', background: 'rgba(var(--accent-rgb),.05)' } : {}}>
      <div className="font-display text-3xl leading-none mb-1" style={{ color: highlight ? 'var(--accent)' : 'var(--text-1)' }}>
        {value}
      </div>
      <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{label}</div>
    </div>
  )
}

export default function PostWorkoutModal({ workout, elapsed, onClose }) {
  const [show, setShow] = useState(false)
  useEffect(() => { setTimeout(() => setShow(true), 100) }, [])

  if (!workout) return null

  const totalSets  = workout.exercises.reduce((a,ex) => a + ex.sets.length, 0)
  const doneSets   = workout.exercises.reduce((a,ex) => a + ex.sets.filter(s=>s.done).length, 0)
  const totalVol   = workout.exercises.reduce((a,ex) =>
    a + ex.sets.reduce((b,s) => b + parseWeight(s.weight)*(parseInt(s.reps)||0), 0), 0)
  const totalReps  = workout.exercises.reduce((a,ex) =>
    a + ex.sets.reduce((b,s) => b + (parseInt(s.reps)||0), 0), 0)
  const pct        = totalSets > 0 ? Math.round((doneSets/totalSets)*100) : 0

  const messages = {
    100: ['🔥 Treino 100% completo! Você é uma máquina!', 'Incrível! Nenhuma série ficou pra trás.'],
    75:  ['💪 Ótimo treino! Quase lá!', 'Mais de 75% das séries concluídas. Força!'],
    50:  ['👊 Bom trabalho! Continue assim.', 'Cada treino conta. Amanhã você vai mais longe.'],
    0:   ['✅ Treino registrado!', 'Cada vez que você aparece, já ganhou.'],
  }
  const msg = pct === 100 ? messages[100] : pct >= 75 ? messages[75] : pct >= 50 ? messages[50] : messages[0]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(12px)' }}>
      <div className={`w-full max-w-lg transition-all duration-500 ${show ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
        style={{ background: 'var(--surface)', borderRadius: '28px 28px 0 0', border: '1px solid var(--border)', borderBottom: 'none', padding: '32px 24px 40px' }}>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{pct === 100 ? '🏆' : pct >= 75 ? '💪' : '✅'}</div>
          <h2 className="font-display text-3xl uppercase tracking-wide mb-1" style={{ color: 'var(--text-1)' }}>
            {msg[0]}
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>{msg[1]}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatBox label="Duração"   value={formatDuration(elapsed)} highlight />
          <StatBox label="Volume"    value={formatVolume(totalVol)} />
          <StatBox label="Séries"    value={`${doneSets}/${totalSets}`} />
          <StatBox label="Reps"      value={totalReps} />
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: 'var(--text-3)' }}>
            <span>Séries completas</span>
            <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{pct}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${pct}%`, background: 'var(--accent)', boxShadow: '0 0 8px rgba(var(--accent-rgb),.5)', transitionDelay: '.3s' }}/>
          </div>
        </div>

        {/* Exercises summary */}
        <div className="space-y-1.5 mb-6 max-h-32 overflow-y-auto">
          {workout.exercises.map(ex => {
            const exDone = ex.sets.filter(s=>s.done).length
            return (
              <div key={ex.id} className="flex items-center justify-between text-sm px-2">
                <span style={{ color: exDone === ex.sets.length ? 'var(--text-1)' : 'var(--text-3)' }}>
                  {exDone === ex.sets.length ? '✓' : '○'} {ex.name}
                </span>
                <span style={{ color: 'var(--text-3)', fontSize: 12 }}>
                  {exDone}/{ex.sets.length} séries
                </span>
              </div>
            )
          })}
        </div>

        <button onClick={onClose}
          className="f-btn f-btn-accent w-full py-4 text-base font-display uppercase tracking-widest">
          Concluir Treino 🎉
        </button>
      </div>
    </div>
  )
}
