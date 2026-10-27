import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { workoutLogService, routineService, notificationService } from '@/services'
import { calcStreak, calcBestStreak, getRecoverySnapshot, getRoutineDates, localDateKey, getSubscription } from '@/utils/helpers'
import { SkeletonHome } from '@/components/ui/Skeleton'
import { Chevron } from '@/components/ui'
import WorkoutLogModal from '@/components/WorkoutLogModal'
import HomeHealthCards from '@/components/health/HomeHealthCards'

const AC  = 'var(--accent)'
const ACT = 'var(--accent-text)'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function StatMini({ label, value, accent, delta }) {
  return (
    <div className="home-stat">
      <div className="font-display text-2xl leading-none" style={{ color: accent ? ACT : 'var(--text-1)' }}>
        {value ?? '—'}
      </div>
      <div className="text-xs mt-1 font-medium" style={{ color: 'var(--text-3)' }}>{label}</div>
      {delta !== undefined && delta !== null && (
        <div className={`progress-chip mt-1 ${delta > 0 ? 'up' : delta < 0 ? 'down' : 'same'}`}>
          {delta > 0 ? `+${delta}` : delta === 0 ? '=' : delta}
        </div>
      )}
    </div>
  )
}

function NotificationPanel({ userId }) {
  const [items, setItems] = useState([])
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!userId) return
    notificationService.getRecent(userId).then(({ data, error: loadError }) => {
      setItems(data || [])
      setError(Boolean(loadError))
    })
  }, [userId])

  const unread = items.filter(item => !item.read_at)
  if (error || !items.length) return null

  async function markAllRead() {
    const { error: markError } = await notificationService.markRead(userId, unread.map(item => item.id))
    if (!markError) setItems(current => current.map(item => ({ ...item, read_at: item.read_at || new Date().toISOString() })))
  }

  return (
    <section className="f-card p-4" aria-label="Notificações">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Notificações</h2>
        {unread.length > 0 && (
          <button type="button" onClick={markAllRead} className="text-xs font-semibold" style={{ color: ACT }}>
            Marcar como lidas
          </button>
        )}
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="notification-row" style={{ opacity: item.read_at ? .65 : 1 }}>
            <span className="notification-row__dot" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{item.title}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{item.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function QuickActions({ navigate }) {
  const actions = [
    { path: '/app/outdoor', label: 'Ao ar livre', hint: 'Corrida, caminhada e pedal', icon: 'outdoor' },
    { path: '/app/routine', label: 'Rotina', hint: 'Editar ficha', icon: 'calendar' },
    { path: '/app/history', label: 'Histórico', hint: 'Ver treinos', icon: 'history' },
    { path: '/app/evolution', label: 'Evolução', hint: 'Acompanhar dados', icon: 'chart' },
    { path: '/app/photos', label: 'Progresso', hint: 'Fotos e medidas', icon: 'camera' },
  ]

  const icons = {
    outdoor: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h3"/></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
    chart: <><path d="M4 19V5M4 19h16"/><path d="m7 15 3-4 3 2 5-7"/></>,
    camera: <><path d="M4 7h3l1.5-2h7L17 7h3v12H4z"/><circle cx="12" cy="13" r="3"/></>,
  }

  return (
    <section className="home-quick-actions" aria-labelledby="home-quick-actions-title">
      <h2 id="home-quick-actions-title" className="text-lg font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
        Continue sua jornada
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {actions.map(action => (
          <button
            key={action.path}
            type="button"
            onClick={() => navigate(action.path)}
            className="home-quick-action f-card p-3 flex items-center gap-3 text-left"
          >
            <span className="home-quick-action__icon" aria-hidden="true">
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {icons[action.icon]}
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{action.label}</span>
              <span className="block text-xs mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{action.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function RecoveryPanel({ logs, navigate }) {
  const snapshot = getRecoverySnapshot(logs)
  if (!snapshot.length) return null

  return (
    <section className="home-recovery f-card p-4" aria-labelledby="home-recovery-title">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 id="home-recovery-title" className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>
          Prontidão muscular
        </h2>
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>últimos 4 dias</span>
      </div>
      <div className="space-y-2">
        {snapshot.slice(0, 3).map(item => {
          const ready = item.status === 'pronto'
          return (
            <div key={item.muscle} className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: ready ? 'var(--success-solid)' : item.status === 'quase pronto' ? 'var(--warning-solid)' : 'var(--danger-solid)' }}
                aria-hidden="true" />
              <span className="text-sm flex-1" style={{ color: 'var(--text-2)' }}>{item.muscle}</span>
              <span className="text-xs font-semibold" style={{ color: ready ? 'var(--success)' : 'var(--text-3)' }}>
                {ready ? 'Pronto' : item.status}
              </span>
            </div>
          )
        })}
      </div>
      <button type="button" onClick={() => navigate('/app/evolution')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold mt-3 min-h-[44px]"
        style={{ color: 'var(--accent-text)' }}>
        Ver análise completa
        <Chevron size={13}/>
      </button>
    </section>
  )
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100]


// ── Resumo Semanal Banner ─────────────────────────────────────
function WeeklySummaryBanner({ lastWeek, metrics, streak }) {
  const [dismissed, setDismissed] = React.useState(
    () => localStorage.getItem('voryn_summary_dismissed') === localDateKey().slice(0,7)
  )
  // Só mostrar às segundas-feiras
  const isMonday = new Date().getDay() === 1
  if (!isMonday || dismissed || !lastWeek) return null
  if (lastWeek.prevWeek === 0 && lastWeek.thisWeek === 0) return null

  const volumeK = metrics?.totalVolume ? (metrics.totalVolume / 1000).toFixed(1) : null

  function dismiss() {
    localStorage.setItem('voryn_summary_dismissed', localDateKey().slice(0,7))
    setDismissed(true)
  }

  return (
    <div className="home-weekly-summary f-card p-4 animate-slide-up">
      <div className="flex items-start justify-between mb-3">
        <p className="font-semibold text-sm" style={{ color:'var(--text-1)' }}>
          Resumo da semana passada
        </p>
        <button type="button" aria-label="Fechar resumo semanal" onClick={dismiss} className="icon-btn" style={{ color:'var(--text-3)', marginTop:2 }}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label:'Treinos',  value: lastWeek.prevWeek },
          { label:'Sequência',value: streak + ' dias' },
          ...(volumeK ? [{ label:'Volume', value: volumeK + 't' }] : []),
        ].map(s => (
          <div key={s.label} className="text-center py-2" style={{ borderRight: '1px solid var(--rule)' }}>
            <div className="font-display text-lg leading-none" style={{ color:'var(--accent-text)' }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color:'var(--text-3)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <p className="text-sm leading-relaxed" style={{ color:'var(--text-2)' }}>
        {lastWeek.delta > 0
          ? `Você treinou ${lastWeek.delta} vez${lastWeek.delta > 1 ? 'es' : ''} a mais que na semana anterior.`
          : lastWeek.delta < 0
          ? `Semana passada foi mais leve. Essa semana você bota pra quebrar.`
          : `Mesma frequência da semana anterior. Consistência é tudo.`}
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
  const [recentLogs,   setRecentLogs]   = useState([])
  const [metrics,      setMetrics]      = useState(null)
  const [lastWeek,     setLastWeek]     = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(false)
  const [reloadKey,    setReloadKey]    = useState(0)
  const [openLogDate,  setOpenLogDate]  = useState(null)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))

  const todayKey = localDateKey(today)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    setLoadError(false)
    Promise.all([
      workoutLogService.getTrainedDates(user.id),
      routineService.getAll(user.id),
      workoutLogService.getMetrics(user.id),
      workoutLogService.getAll(user.id, localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7))),
    ]).then(([dates, { data: rts }, m, { data: logs }]) => {
      if (cancelled) return
      setTrainedDates(dates || [])
      setRoutines(rts || {})
      setRecentLogs(logs || [])
      setMetrics(m)

      const oneWeekAgo  = new Date(today); oneWeekAgo.setDate(today.getDate() - 7)
      const twoWeeksAgo = new Date(today); twoWeeksAgo.setDate(today.getDate() - 14)
      const thisWeekCount = (dates || []).filter(d => new Date(d) >= oneWeekAgo).length
      const prevWeekCount = (dates || []).filter(d => new Date(d) >= twoWeeksAgo && new Date(d) < oneWeekAgo).length
      setLastWeek({ thisWeek: thisWeekCount, prevWeek: prevWeekCount, delta: thisWeekCount - prevWeekCount })
    }).catch(() => {
      if (!cancelled) setLoadError(true)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
    // 'today' é `new Date()` recém-criado a cada render (não memoizado);
    // incluí-lo aqui faria esse fetch rodar de novo em toda renderização,
    // não só quando o usuário muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey])

  const oldestTrainedDate = trainedDates.length
    ? new Date(`${[...trainedDates].sort()[0]}T12:00:00`)
    : new Date(today.getFullYear(), today.getMonth(), today.getDate() - 365)
  const eligibleDates = getRoutineDates(routines, oldestTrainedDate, today)
  const streak     = calcStreak(trainedDates, eligibleDates)
  const bestStreak = calcBestStreak(trainedDates, eligibleDates)
  const todayPlan  = routines[today.getDay()]

  const isStreakMilestone = STREAK_MILESTONES.includes(streak)

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    const key = localDateKey(date)
    return { date, key, isToday: key === todayKey, trained: trainedDates.includes(key) }
  })

  const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)
  const monthDays = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate()
  const calendarOffset = monthStart.getDay()
  const calendarCells = Array.from({ length: calendarOffset + monthDays }, (_, index) => {
    if (index < calendarOffset) return null
    const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index - calendarOffset + 1)
    const key = localDateKey(date)
    return { date, key, isToday: key === todayKey, trained: trainedDates.includes(key) }
  })
  const monthLabel = calendarMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const moveCalendar = (amount) => setCalendarMonth(current => new Date(current.getFullYear(), current.getMonth() + amount, 1))

  const homeSub     = getSubscription(profile)
  const isTrial     = homeSub?.status === 'trialing'
  const trialEnds   = homeSub?.trial_ends_at
  const trialDaysLeft = trialEnds
    ? Math.max(0, Math.ceil((new Date(trialEnds) - new Date()) / 86400000))
    : 0

  if (loading) return <SkeletonHome/>
  if (loadError) return (
    <div className="app-view px-4 pt-10 pb-8">
      <div className="f-card p-8 text-center space-y-4">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-1)' }}>Não foi possível carregar</h1>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>Verifique sua conexão e tente novamente.</p>
        <button type="button" onClick={() => setReloadKey(key => key + 1)} className="f-btn f-btn-accent mx-auto">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <>
    <div className="app-view home-view px-4 pt-6 pb-6 space-y-5">

      {/* Trial banner */}
      {isTrial && (
        <div className="home-trial-banner f-card px-4 py-3 flex items-center justify-between animate-slide-up">
          <p className="text-sm font-medium" style={{ color: 'var(--warning)' }}>
            {trialDaysLeft > 0 ? `${trialDaysLeft} dias de trial restantes` : 'Trial expirado'}
          </p>
          <button onClick={() => navigate('/app/subscription')}
            className="text-xs font-semibold px-3 py-1.5 rounded-pill whitespace-nowrap"
            style={{ background: 'rgba(var(--warning-rgb), .15)', color: 'var(--warning)', border: '1px solid rgba(var(--warning-rgb), .3)' }}>
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
      <div className="home-welcome flex items-start justify-between animate-slide-up">
        <div>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>{greeting()},</p>
          <h1 className="font-display text-3xl uppercase tracking-wide leading-tight"
            style={{ color: 'var(--text-1)' }}>
            {profile?.name?.split(' ')[0] || 'Atleta'}
          </h1>
        </div>
        <button onClick={() => navigate('/app/profile')} aria-label="Lembretes de treino"
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}>
          <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </button>
      </div>

      {/* Semana em círculos */}
      <div className="home-week f-card px-4 py-3 animate-slide-up" aria-label="Semana de treinos">
        <div className="flex justify-between">
          {weekDays.map(({ isToday, trained, date, key }) => (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <span className="text-xs uppercase" style={{ color: isToday ? ACT : 'var(--text-3)', fontWeight: isToday ? 700 : 500 }}>
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][date.getDay()]}
              </span>
              <button
                type="button"
                onClick={trained ? () => setOpenLogDate(key) : undefined}
                aria-label={trained ? `Ver treino de ${date.getDate()}` : `${date.getDate()} sem treino`}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  // Mesma gramática do calendário mensal: o dia treinado é o
                  // círculo PREENCHIDO (é dado — o roxo é cor de dado), o dia
                  // de hoje é só o contorno, e o resto fica neutro. O número
                  // aparece sempre: o preenchimento já diz o que aconteceu.
                  background: trained ? AC : 'var(--surface)',
                  border: isToday && !trained ? `1.5px solid ${AC}` : '1px solid transparent',
                  cursor: trained ? 'pointer' : 'default',
                }}>
                <span className="font-display text-sm"
                  style={{ color: trained ? '#fff' : isToday ? ACT : 'var(--text-3)' }}>{date.getDate()}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Foco de hoje */}
      <div className="home-focus">
        <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-3)' }}>Foco de hoje</p>
        <button onClick={() => navigate('/app/workout')}
          className="home-primary-action f-card w-full p-4 flex items-center justify-between text-left animate-slide-up">
          <div className="min-w-0">
            <span className="home-primary-action__eyebrow">Treino de hoje</span>
            <p className="font-display text-2xl uppercase tracking-wide truncate" style={{ color: 'var(--text-1)' }}>
              {todayPlan?.name || 'Descanso'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
              {todayPlan?.exercises?.length
                ? `${todayPlan.exercises.length} exercício${todayPlan.exercises.length === 1 ? '' : 's'}`
                : 'Dia de descanso'}
            </p>
          </div>
          {/* Glifo solto, sem círculo tintado: o card inteiro é o botão, e
              um ícone em caixa de cor repetida é o vício de painel gerado. */}
          <span className="flex items-center justify-center flex-shrink-0 ml-3"
            style={{ color: 'var(--on-inverse)' }}>
            <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </span>
        </button>
      </div>

      <section className="home-next home-action-card f-card p-4" aria-label="Próxima ação recomendada">
        <div className="flex items-start gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: ACT }}>
              Próxima ação
            </p>
            <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-1)' }}>
              {todayPlan?.exercises?.length
                ? `Você tem ${todayPlan.exercises.length} exercícios prontos para hoje.`
                : `Faltam ${Math.max(0, (profile?.weekly_goal || 3) - (lastWeek?.thisWeek || 0))} treino(s) para sua meta semanal.`}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
              {metrics?.weeklyVolume > 0
                ? `Volume desta semana: ${(metrics.weeklyVolume / 1000).toFixed(1)}t.`
                : 'Comece um treino para criar seu primeiro marco da semana.'}
            </p>
          </div>
        </div>
      </section>

      <QuickActions navigate={navigate} />

      <div className="home-notifications"><NotificationPanel userId={user.id} /></div>

      {/* Calendário mensal */}
      <section className="home-calendar f-card p-4 animate-slide-up" aria-label="Calendário mensal de treinos">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold capitalize" style={{ color: 'var(--text-1)' }}>
            {monthLabel}
          </h2>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => moveCalendar(-1)} aria-label="Mês anterior"
              className="w-9 h-9 rounded-lg flex items-center justify-center active:scale-[.97] transition-transform"
              style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}>
              <Chevron direction="left" size={16} />
            </button>
            <button type="button" onClick={() => moveCalendar(1)} aria-label="Próximo mês"
              className="w-9 h-9 rounded-lg flex items-center justify-center active:scale-[.97] transition-transform"
              style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}>
              <Chevron direction="right" size={16} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-y-2 text-center">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
            <span key={`${day}-${index}`} className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>{day}</span>
          ))}
          {calendarCells.map((cell, index) => cell ? (
            <button key={cell.key} type="button"
              onClick={cell.trained ? () => setOpenLogDate(cell.key) : undefined}
              aria-label={`${cell.trained ? 'Ver treino de ' : ''}${cell.date.getDate()} de ${monthLabel}`}
              className="mx-auto w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold tabular-nums transition-colors"
              style={{
                // Fundo de dia treinado usa --accent (preenchimento, 5.70:1 com
                // branco), não --accent-text: aquele é token de TEXTO e como
                // fundo deixava o número do dia em 3.34:1 — reprovando AA.
                color: cell.trained ? '#fff' : cell.isToday ? ACT : 'var(--text-2)',
                background: cell.trained ? AC : 'transparent',
                border: cell.isToday && !cell.trained ? `1px solid ${AC}` : '1px solid transparent',
                cursor: cell.trained ? 'pointer' : 'default',
              }}>
              {cell.date.getDate()}
            </button>
          ) : <span key={`empty-${index}`} aria-hidden="true" />)}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-3)' }}>
            <span className="w-2 h-2 rounded-full" aria-hidden="true" style={{ background: AC }} /> Treino concluído
          </span>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-3)' }}>
            <span className="w-2 h-2 rounded-full" aria-hidden="true" style={{ border: `1px solid ${AC}` }} /> Hoje
          </span>
        </div>
      </section>

      <RecoveryPanel logs={recentLogs} navigate={navigate} />

      {/* Sequência */}
      <div className={`home-streak f-card px-4 py-3 flex items-center gap-2.5 animate-slide-up ${isStreakMilestone ? 'streak-milestone' : ''}`}>
        <svg width="18" height="18" fill={ACT} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2c1 3-2 4-2 7a3 3 0 006 0c1.5 1.5 2 3.5 2 5a6 6 0 11-12 0c0-4 3-6 3-9 1 0 2.5.5 3 3z"/>
        </svg>
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>
          <strong style={{ color: ACT }}>{streak} dia{streak === 1 ? '' : 's'}</strong> de sequência, seu recorde é {bestStreak}
        </p>
      </div>

      {/* 3 métricas */}
      <div className="home-metrics f-card kpi-row px-4 py-3 grid grid-cols-3">
        <StatMini label="treinos/sem" value={lastWeek?.thisWeek ?? 0} accent/>
        <StatMini label="volume/sem" value={metrics?.weeklyVolume ? `${(metrics.weeklyVolume / 1000).toFixed(1)}t` : '0t'} accent/>
        <StatMini label="vs. sem. passada"
          value={lastWeek?.prevWeek ? `${lastWeek.delta >= 0 ? '+' : ''}${Math.round((lastWeek.delta / lastWeek.prevWeek) * 100)}%` : '—'}/>
      </div>
      <HomeHealthCards key={user.id} />
    </div>

    {openLogDate && (
      <WorkoutLogModal userId={user.id} date={openLogDate} onClose={() => setOpenLogDate(null)}/>
    )}
    </>
  )
}
