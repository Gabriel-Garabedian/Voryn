import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { workoutLogService } from '@/services'
import { formatDuration, formatDate, formatVolume, getPlanLimit } from '@/utils/helpers'
import { SkeletonList } from '@/components/ui/Skeleton'

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function LogCard({ log }) {
  const [open, setOpen] = useState(false)
  const totalSets = log.exercises?.reduce((a, ex) => a + ex.sets?.length, 0) || 0
  const doneSets  = log.exercises?.reduce((a, ex) => a + (ex.sets?.filter(s => s.done)?.length || 0), 0) || 0

  return (
    <div className="f-card overflow-hidden transition-all">
      <button onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center gap-3 text-left">
        {/* Date box */}
        <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(var(--accent-rgb),.1)', border: '1px solid rgba(var(--accent-rgb),.2)' }}>
          <span className="font-display text-lg leading-none" style={{ color: 'var(--accent)' }}>
            {log.date?.slice(8)}
          </span>
          <span className="text-xs uppercase" style={{ color: 'var(--text-3)' }}>
            {MONTHS_PT[parseInt(log.date?.slice(5,7)) - 1]}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>{log.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>
              {formatDuration(log.duration)}
            </span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>
              {log.exercises?.length || 0} exercícios
            </span>
            {log.total_volume > 0 && <>
              <span style={{ color: 'var(--border)' }}>·</span>
              <span className="text-xs" style={{ color: 'var(--accent)' }}>
                {formatVolume(log.total_volume)}
              </span>
            </>}
          </div>
        </div>

        {/* Chevron */}
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24"
          stroke="var(--muted)" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s', flexShrink: 0 }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 animate-slide-up"
          style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label:'Duração',  value: formatDuration(log.duration) },
              { label:'Séries',   value: `${doneSets}/${totalSets}` },
              { label:'Volume',   value: formatVolume(log.total_volume) },
            ].map(s => (
              <div key={s.label} className="text-center py-2 rounded-lg" style={{ background: 'var(--surface)' }}>
                <div className="font-display text-base" style={{ color: 'var(--accent)' }}>{s.value}</div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Exercises */}
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function HistoryView() {
  const { user, plan } = useAuth()
  const navigate = useNavigate()
  const [logs,    setLogs]    = useState([])
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)
  const [period,  setPeriod]  = useState('all') // 'week'|'month'|'3months'|'all'

  const historyDays = getPlanLimit(plan, 'historyDays')
  const isLimited   = historyDays < 365

  useEffect(() => {
    if (!user) return
    // Aplica o gate de historyDays do plano (ver workoutLogService.getAll):
    // no free, só os últimos 7 dias são trazidos do banco — antes disso
    // não acontecia, e quem não assinava continuava vendo o histórico
    // completo de treinos para sempre.
    let sinceDate
    if (isLimited) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - historyDays)
      sinceDate = cutoff.toISOString().split('T')[0]
    }
    workoutLogService.getAll(user.id, sinceDate)
      .then(({ data }) => { setLogs(data || []); setLoading(false) })
      .catch(err => { console.error('[Voryn] HistoryView falhou ao carregar:', err); setLoading(false) })
  }, [user, isLimited, historyDays])

  const filtered = useMemo(() => {
    let result = [...logs]

    // Period filter
    if (period !== 'all') {
      const now = new Date()
      const cutoff = new Date(now)
      if (period === 'week')    cutoff.setDate(now.getDate() - 7)
      if (period === 'month')   cutoff.setMonth(now.getMonth() - 1)
      if (period === '3months') cutoff.setMonth(now.getMonth() - 3)
      result = result.filter(l => new Date(l.date) >= cutoff)
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(l =>
        l.name?.toLowerCase().includes(q) ||
        l.exercises?.some(e => e.name?.toLowerCase().includes(q))
      )
    }

    return result
  }, [logs, search, period])

  // Stats from filtered
  const totalDuration = filtered.reduce((a, l) => a + (l.duration || 0), 0)
  const totalVolume   = filtered.reduce((a, l) => a + (parseFloat(l.total_volume) || 0), 0)

  if (loading) return (
    <div className="px-4 pt-6 pb-8">
      <div className="skeleton-pulse h-8 w-32 rounded-lg mb-2" style={{ background: 'var(--border)' }}/>
      <div className="skeleton-pulse h-4 w-20 rounded mb-6" style={{ background: 'var(--border)' }}/>
      <SkeletonList count={5}/>
    </div>
  )

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="font-display text-3xl uppercase tracking-wide mb-1" style={{ color: 'var(--text-1)' }}>
        Histórico
      </h1>
      <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>{logs.length} treinos registrados</p>

      {isLimited && (
        <button onClick={() => navigate('/app/subscription')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-4 text-left transition-all"
          style={{ background: 'rgba(var(--accent-rgb),.08)', border: '1px solid rgba(var(--accent-rgb),.25)' }}>
          <span className="text-lg">🔒</span>
          <span className="flex-1 text-xs" style={{ color: 'var(--text-2)' }}>
            Mostrando só os últimos {historyDays} dias. Assine para ver todo o seu histórico.
          </span>
          <span className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--accent)' }}>Assinar</span>
        </button>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="16" height="16"
          fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input className="f-input pl-9" placeholder="Buscar treino ou exercício..."
          value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {[['all','Todos'],['week','7 dias'],['month','30 dias'],['3months','3 meses']].map(([val, lbl]) => (
          <button key={val} onClick={() => setPeriod(val)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: period===val ? 'var(--accent)' : 'var(--card)',
              color:      period===val ? '#fff'          : 'var(--text-3)',
              border:     `1px solid ${period===val ? 'var(--accent)' : 'var(--border)'}`,
            }}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Treinos',  value: filtered.length },
            { label: 'Tempo',    value: formatDuration(totalDuration) },
            { label: 'Volume',   value: formatVolume(totalVolume) },
          ].map(s => (
            <div key={s.label} className="f-card p-3 text-center">
              <div className="font-display text-xl" style={{ color: 'var(--accent)' }}>{s.value}</div>
              <div className="text-xs" style={{ color: 'var(--text-3)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {filtered.length === 0
        ? (
          <div className="f-card p-8 text-center space-y-2">
            <div className="text-4xl">📭</div>
            <p className="font-semibold" style={{ color: 'var(--text-1)' }}>
              {logs.length === 0 ? 'Nenhum treino registrado ainda' : 'Nenhum resultado encontrado'}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              {logs.length === 0 ? 'Complete seu primeiro treino para vê-lo aqui.' : 'Tente outro termo de busca.'}
            </p>
          </div>
        )
        : (
          <div className="space-y-2">
            {filtered.map(log => <LogCard key={log.id} log={log}/>)}
          </div>
        )
      }
    </div>
  )
}
