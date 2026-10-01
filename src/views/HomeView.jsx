import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { workoutLogService, routineService } from '@/services'
import { calcStreak, calcBestStreak, localDateKey, getSubscription } from '@/utils/helpers'
import { SkeletonHome } from '@/components/ui/Skeleton'
import WorkoutLogModal from '@/components/WorkoutLogModal'

const AC        = 'var(--accent)'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function StatMini({ label, value, accent, delta }) {
  return (
    <div className="f-card p-3 text-center">
      <div className="font-display text-2xl leading-none" style={{ color: accent ? AC : 'var(--text-1)' }}>
        {value ?? '—'}
      </div>
      <div className="text-xs mt-1 font-medium" style={{ color: 'var(--text-3)' }}>{label}</div>
      {delta !== undefined && delta !== null && (
        <div className={`progress-chip mt-1 mx-auto ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'same'}`}>
          {delta > 0 ? `+${delta}` : delta === 0 ? '=' : delta}
        </div>
      )}
    </div>
  )
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100]


// ── Resumo Semanal Banner ─────────────────────────────────────
function WeeklySummaryBanner({ lastWeek, metrics, streak }) {
  const [dismissed, setDismissed] = React.useState(
    () => localStorage.getItem('voryn_summary_dismissed') === new Date().toISOString().slice(0,7)
  )
  // Só mostrar às segundas-feiras
  const isMonday = new Date().getDay() === 1
  if (!isMonday || dismissed || !lastWeek) return null
  if (lastWeek.prevWeek === 0 && lastWeek.thisWeek === 0) return null

  const volumeK = metrics?.totalVolume ? (metrics.totalVolume / 1000).toFixed(1) : null

  function dismiss() {
    localStorage.setItem('voryn_summary_dismissed', new Date().toISOString().slice(0,7))
    setDismissed(true)
  }

  return (
    <div className="f-card p-4 animate-slide-up"
      style={{ borderColor:'rgba(var(--accent-rgb),.3)', background:'rgba(var(--accent-rgb),.05)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="summary-mark">WK</span>
          <p className="font-semibold text-sm" style={{ color:'var(--text-1)' }}>
            Resumo da semana passada
          </p>
        </div>
        <button onClick={dismiss} style={{ color:'var(--text-3)', marginTop:2 }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label:'Treinos',  value: lastWeek.prevWeek, icon:'01' },
          { label:'Sequência',value: streak + ' dias',  icon:'02' },
          ...(volumeK ? [{ label:'Volume', value: volumeK + 't', icon:'03' }] : []),
        ].map(s => (
          <div key={s.label} className="text-center py-2 rounded-xl"
            style={{ background:'rgba(var(--accent-rgb),.08)', border:'1px solid rgba(var(--accent-rgb),.12)' }}>
            <div className="summary-mark text-base mb-0.5">{s.icon}</div>
            <div className="font-display text-lg leading-none" style={{ color:'var(--accent)' }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color:'var(--text-3)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <p className="text-xs leading-relaxed" style={{ color:'var(--text-2)' }}>
        {lastWeek.delta > 0
          ? `Você treinou ${lastWeek.delta} vez${lastWeek.delta > 1 ? 'es' : ''} a mais que na semana anterior! Continue assim.`
          : lastWeek.delta < 0
          ? `💪 Semana passada foi mais leve. Essa semana você bota pra quebrar!`
          : `✅ Mesma frequência da semana anterior. Consistência é tudo!`}
      </p>
    </div>
  )
}

export default function HomeView() {
  const { profile, user } = useAuth()
  const navigate = useNavigate()
  // Handle payment success redirect from MP
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      // Remove param from URL without reload
      window.history.replaceState({}, '', '/app')
      // Small delay to let toast system mount
      setTimeout(() => {
        // Can't call toast here directly — use a custom event
        window.dispatchEvent(new CustomEvent('voryn:payment_success'))
      }, 500)
    }
  }, [])

  const today    = new Date()

  const [trainedDates, setTrainedDates] = useState([])
  const [routines,     setRoutines]     = useState({})
  const [metrics,      setMetrics]      = useState(null)
  const [lastWeek,     setLastWeek]     = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [openLogDate,  setOpenLogDate]  = useState(null)

  const todayKey = localDateKey(today)

  useEffect(() => {
    if (!user) return
    Promise.all([
      workoutLogService.getTrainedDates(user.id),
      routineService.getAll(user.id),
      workoutLogService.getMetrics(user.id),
    ]).then(([dates, { data: rts }, m]) => {
      setTrainedDates(dates || [])
      setRoutines(rts || {})
      setMetrics(m)

      // Calculate last week count for delta
      const oneWeekAgo  = new Date(today); oneWeekAgo.setDate(today.getDate() - 7)
      const twoWeeksAgo = new Date(today); twoWeeksAgo.setDate(today.getDate() - 14)
      const thisWeekCount = (dates || []).filter(d => new Date(d) >= oneWeekAgo).length
      const prevWeekCount = (dates || []).filter(d => new Date(d) >= twoWeeksAgo && new Date(d) < oneWeekAgo).length
      setLastWeek({ thisWeek: thisWeekCount, prevWeek: prevWeekCount, delta: thisWeekCount - prevWeekCount })
      setLoading(false)
    })
    // 'today' é `new Date()` recém-criado a cada render (não memoizado);
    // incluí-lo aqui faria esse fetch rodar de novo em toda renderização,
    // não só quando o usuário muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const streak     = calcStreak(trainedDates)
  const bestStreak = calcBestStreak(trainedDates)
  const todayPlan  = routines[today.getDay()]

  const isStreakMilestone = STREAK_MILESTONES.includes(streak)

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    const k = localDateKey(d)
    return { date: d, dayIndex: i, key: k, plan: routines[i], isToday: k === todayKey, trained: trainedDates.includes(k) }
  })

  const homeSub     = getSubscription(profile)
  const isTrial     = homeSub?.status === 'trialing'
  const trialEnds   = homeSub?.trial_ends_at
  const trialDaysLeft = trialEnds
    ? Math.max(0, Math.ceil((new Date(trialEnds) - new Date()) / 86400000))
    : 0

  if (loading) return <SkeletonHome/>

  return (
    <>
    <div className="app-view home-view px-4 pt-6 pb-6 space-y-5">

      {/* Trial banner */}
      {isTrial && (
        <div className="f-card px-4 py-3 flex items-center justify-between animate-slide-up"
          style={{ borderColor: 'rgba(250,204,21,.3)', background: 'rgba(250,204,21,.05)' }}>
          <div className="flex items-center gap-2">
            <span className="summary-mark">TRIAL</span>
            <p className="text-sm font-medium" style={{ color: '#facc15' }}>
              {trialDaysLeft > 0 ? `${trialDaysLeft} dias de trial restantes` : 'Trial expirado'}
            </p>
          </div>
          <button onClick={() => navigate('/app/subscription')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap"
            style={{ background: 'rgba(250,204,21,.15)', color: '#facc15', border: '1px solid rgba(250,204,21,.3)' }}>
            Assinar
          </button>
        </div>
      )}

      {/* Resumo semanal — aparece toda segunda-feira */}
      {!loading && (
        <WeeklySummaryBanner lastWeek={lastWeek} metrics={metrics} streak={streak}/>
      )}

      {/* Header: saudação + sino (leva pros lembretes de treino, no Perfil —
          não existe central de notificação própria, então reaproveita a
          tela que já tem esse toggle em vez de criar uma nova). */}
      <div className="flex items-start justify-between animate-slide-up">
        <div>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>{greeting()},</p>
          <h1 className="font-display text-3xl uppercase tracking-wide leading-tight"
            style={{ color: 'var(--text-1)' }}>
            {profile?.name?.split(' ')[0] || 'Atleta'}
          </h1>
        </div>
        <button onClick={() => navigate('/app/profile')} aria-label="Lembretes de treino"
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(var(--accent-rgb),.14)', border: '1px solid rgba(var(--accent-rgb),.3)', color: AC }}>
          <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </button>
      </div>

      {/* Semana em círculos */}
      <div className="flex justify-between animate-slide-up">
        {weekDays.map(({ dayIndex, isToday, trained, date, key }) => (
          <div key={dayIndex} className="flex flex-col items-center gap-1.5">
            <span className="text-xs uppercase" style={{ color: isToday ? AC : 'var(--text-3)', fontWeight: isToday ? 700 : 500 }}>
              {['D','S','T','Q','Q','S','S'][dayIndex]}
            </span>
            <div
              onClick={trained ? () => setOpenLogDate(key) : undefined}
              role={trained ? 'button' : undefined}
              aria-label={trained ? `Ver treino de ${date.getDate()}` : undefined}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: trained ? AC : isToday ? 'rgba(var(--accent-rgb),.14)' : 'var(--surface)',
                border: isToday && !trained ? `1.5px solid ${AC}` : '1px solid transparent',
                cursor: trained ? 'pointer' : 'default',
              }}>
              {trained ? (
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <span className="font-display text-sm" style={{ color: isToday ? AC : 'var(--text-3)' }}>{date.getDate()}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Sequência */}
      <div className={`f-card px-4 py-3 flex items-center gap-2.5 animate-slide-up ${isStreakMilestone ? 'streak-milestone' : ''}`}
        style={{ borderColor: 'rgba(var(--accent-rgb),.3)', background: 'rgba(var(--accent-rgb),.06)' }}>
        <svg width="18" height="18" fill={AC} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2c1 3-2 4-2 7a3 3 0 006 0c1.5 1.5 2 3.5 2 5a6 6 0 11-12 0c0-4 3-6 3-9 1 0 2.5.5 3 3z"/>
        </svg>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>
          <strong style={{ color: AC }}>{streak} dia{streak === 1 ? '' : 's'}</strong> de sequência — seu recorde é {bestStreak}
        </p>
      </div>

      {/* Foco de hoje */}
      <div>
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>Foco de hoje</p>
        <button onClick={() => navigate('/app/workout')}
          className="f-card w-full p-4 flex items-center justify-between text-left animate-slide-up glow-primary"
          style={{ borderColor: 'rgba(var(--accent-rgb),.35)', background: 'rgba(var(--accent-rgb),.06)' }}>
          <div className="min-w-0">
            <p className="font-display text-2xl uppercase tracking-wide truncate" style={{ color: 'var(--text-1)' }}>
              {todayPlan?.name || 'Descanso'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
              {todayPlan?.exercises?.length
                ? `${todayPlan.exercises.length} exercício${todayPlan.exercises.length === 1 ? '' : 's'}`
                : 'Dia de descanso'}
            </p>
          </div>
          <span className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ml-3"
            style={{ background: AC, boxShadow: '0 0 16px rgba(var(--accent-rgb),.5)' }}>
            <svg width="18" height="18" fill="#fff" viewBox="0 0 24 24" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </span>
        </button>
      </div>

      {/* 3 métricas */}
      <div className="grid grid-cols-3 gap-2">
        <StatMini label="treinos/sem" value={lastWeek?.thisWeek ?? 0} accent/>
        <StatMini label="volume/sem" value={metrics?.weeklyVolume ? `${(metrics.weeklyVolume / 1000).toFixed(1)}t` : '0t'} accent/>
        <StatMini label="vs. sem. passada"
          value={lastWeek?.prevWeek ? `${lastWeek.delta >= 0 ? '+' : ''}${Math.round((lastWeek.delta / lastWeek.prevWeek) * 100)}%` : '—'}/>
      </div>
    </div>

    {openLogDate && (
      <WorkoutLogModal userId={user.id} date={openLogDate} onClose={() => setOpenLogDate(null)}/>
    )}
    </>
  )
}
