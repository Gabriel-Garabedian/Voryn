import React, { useEffect, useState } from 'react'
import { workoutLogService } from '@/services'
import { formatDuration, formatVolume } from '@/utils/helpers'

const MONTHS_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

function StatBoxSmall({ label, value }) {
  return (
    <div className="text-center py-2 rounded-lg" style={{ background: 'var(--card)' }}>
      <div className="font-display text-base" style={{ color: 'var(--accent)' }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</div>
    </div>
  )
}

// Abre ao clicar num dia treinado no calendário da Home. Busca só o treino
// daquele dia (workoutLogService.getByDate) em vez de exigir que a Home já
// tenha o histórico inteiro carregado — mesmo espírito de getTrainedDates
// já usar só 'date', leve o bastante pra pintar o calendário sem puxar tudo.
export default function WorkoutLogModal({ userId, date, onClose }) {
  const [show,    setShow]    = useState(false)
  const [loading, setLoading] = useState(true)
  const [log,     setLog]     = useState(null)

  useEffect(() => { const t = setTimeout(() => setShow(true), 20); return () => clearTimeout(t) }, [])

  useEffect(() => {
    if (!userId || !date) return
    setLoading(true)
    workoutLogService.getByDate(userId, date).then(({ data }) => {
      setLog(data?.[0] || null)
      setLoading(false)
    })
  }, [userId, date])

  function handleClose() {
    setShow(false)
    setTimeout(onClose, 250) // espera a animação de saída antes de desmontar
  }

  const [y, m, d] = date.split('-').map(Number)
  const totalSets = log?.exercises?.reduce((a, ex) => a + (ex.sets?.length || 0), 0) || 0
  const doneSets  = log?.exercises?.reduce((a, ex) => a + (ex.sets?.filter(s => s.done)?.length || 0), 0) || 0

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(12px)' }}
      onClick={handleClose}>
      <div onClick={e => e.stopPropagation()}
        className={`w-full max-w-lg transition-all duration-300 ${show ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
        style={{
          background: 'var(--surface)', borderRadius: '28px 28px 0 0',
          border: '1px solid var(--border)', borderBottom: 'none',
          padding: '24px 24px 32px', maxHeight: '80vh', overflowY: 'auto',
        }}>

        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <p className="font-display text-2xl uppercase tracking-wide truncate" style={{ color: 'var(--text-1)' }}>
              {d} de {MONTHS_PT[m - 1]}
            </p>
            {log?.name && <p className="text-sm truncate" style={{ color: 'var(--text-3)' }}>{log.name}</p>}
          </div>
          <button onClick={handleClose} aria-label="Fechar"
            className="p-2 rounded-lg flex-shrink-0" style={{ color: 'var(--text-3)' }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="space-y-2 py-4">
            <div className="skeleton-pulse h-16 rounded-xl" style={{ background: 'var(--border)' }}/>
            <div className="skeleton-pulse h-16 rounded-xl" style={{ background: 'var(--border)' }}/>
          </div>
        ) : !log ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>
            Não achei os detalhes desse treino.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <StatBoxSmall label="Duração" value={formatDuration(log.duration)}/>
              <StatBoxSmall label="Séries"  value={`${doneSets}/${totalSets}`}/>
              <StatBoxSmall label="Volume"  value={formatVolume(log.total_volume)}/>
            </div>

            <div className="space-y-3">
              {log.exercises?.map((ex, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                    {ex.name}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {ex.sets?.map((set, si) => (
                      <div key={si}
                        className="text-xs px-2 py-1 rounded-lg"
                        style={{
                          background: set.done ? 'rgba(var(--accent-rgb),.12)' : 'var(--surface)',
                          color:      set.done ? 'var(--accent)'         : 'var(--text-3)',
                          border:     `1px solid ${set.done ? 'rgba(var(--accent-rgb),.25)' : 'var(--border)'}`,
                        }}>
                        {set.weight ? `${set.weight}kg` : ''}{set.weight && set.reps ? ' × ' : ''}{set.reps ? `${set.reps}` : '—'}
                      </div>
                    ))}
                  </div>
                  {ex.notes && (
                    <p className="text-xs italic px-2 py-1.5 rounded-lg mt-1"
                      style={{ background: 'var(--surface)', color: 'var(--text-3)' }}>
                      Nota · {ex.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
