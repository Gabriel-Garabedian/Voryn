import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { workoutLogService, routineService } from '@/services'
import { calcStreak, calcBestStreak, localDateKey, getSubscription } from '@/utils/helpers'
import { SkeletonHome } from '@/components/ui/Skeleton'
import WorkoutLogModal from '@/components/WorkoutLogModal'

const MONTHS    = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS_ABR  = ['D','S','T','Q','Q','S','S']
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

const QUICK_ACTIONS = [
  { icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ), label:'Ver Evolução', path:'evolution', color: 'rgba(var(--accent-rgb),.12)', accent: 'var(--accent-2)' },
  { icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
      </svg>
    ), label:'Conquistas', path:'achievements', color: 'rgba(250,204,21,.1)', accent: '#facc15' },
  { icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ), label:'Histórico', path:'history', color: 'rgba(74,222,128,.1)', accent: '#4ade80' },
  { icon: (
      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ), label:'Minhas Metas', path:'goals', color: 'rgba(248,113,113,.1)', accent: '#f87171' },
]

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
  const { profile, user, plan } = useAuth()
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

  const [calYear,      setCalYear]      = useState(today.getFullYear())
  const [calMonth,     setCalMonth]     = useState(today.getMonth())
  const [trainedDates, setTrainedDates] = useState([])
  const [routines,     setRoutines]     = useState({})
  const [metrics,      setMetrics]      = useState(null)
  const [lastWeek,     setLastWeek]     = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [streakFlash,  setStreakFlash]  = useState(false)
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
  }, [user])

  const firstDay   = new Date(calYear, calMonth, 1).getDay()
  const daysInM    = new Date(calYear, calMonth + 1, 0).getDate()
  const monthKey   = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`
  const monthCount = trainedDates.filter(d => d.startsWith(monthKey)).length
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

  function changeMonth(dir) {
    let m = calMonth + dir, y = calYear
    if (m < 0)  { m = 11; y-- }
    if (m > 11) { m = 0;  y++ }
    setCalMonth(m); setCalYear(y)
  }

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

      {/* Header */}
      <div className="home-hero flex items-start justify-between animate-slide-up">
        <div>
          <p className="view-kicker">Performance / 01</p>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>{greeting()},</p>
          <h1 className="font-display text-3xl uppercase tracking-wide leading-tight"
            style={{ color: 'var(--text-1)' }}>
            {profile?.name?.split(' ')[0] || 'Atleta'}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            {todayPlan?.name
              ? <>Hoje: <span style={{ color: AC, fontWeight: 600 }}>{todayPlan.name}</span></>
              : 'Pronto para forjar seu corpo?'}
          </p>
        </div>
        {/* Streak badge with milestone flash */}
        <div className={`f-card px-4 py-2.5 text-center min-w-[72px] ${isStreakMilestone ? 'streak-milestone' : ''}`}
          style={{ borderColor: isStreakMilestone ? 'rgba(250,204,21,.4)' : 'var(--border)' }}>
          <div className="font-display text-3xl leading-none" style={{ color: isStreakMilestone ? '#facc15' : AC }}>
            {streak}
          </div>
          <div className="text-xs uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-3)' }}>
            dias seguidos
          </div>
          {isStreakMilestone && (
            <div className="text-xs mt-1 font-semibold" style={{ color: '#facc15' }}>Marco!</div>
          )}
        </div>
      </div>

      {/* CTA */}
      <button onClick={() => navigate('/app/workout')}
        className="f-btn f-btn-accent glow-primary w-full py-4 text-base font-display uppercase tracking-widest flex items-center justify-center gap-3 animate-slide-up">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Iniciar treino de hoje
      </button>

      {/* Stats row with delta vs last week */}
      <div className="metric-wall grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatMini label="Este mês" value={monthCount} accent/>
        <StatMini label="Total"    value={metrics?.total ?? 0}/>
        <StatMini label="Melhor"   value={bestStreak}/>
        <StatMini label="Semana"   value={lastWeek?.thisWeek ?? 0} accent
          delta={lastWeek?.delta}/>
      </div>

      {/* Last week comparison banner */}
      {lastWeek && lastWeek.delta !== 0 && (
        <div className="f-card px-4 py-3 flex items-center gap-3 animate-slide-up"
          style={{
            borderColor: lastWeek.delta > 0 ? 'rgba(74,222,128,.25)' : 'rgba(248,113,113,.2)',
            background: lastWeek.delta > 0 ? 'rgba(74,222,128,.04)' : 'rgba(248,113,113,.04)',
          }}>
          <span className="summary-mark">{lastWeek.delta > 0 ? 'UP' : 'DOWN'}</span>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>
            {lastWeek.delta > 0
              ? <><strong style={{ color: '#4ade80' }}>+{lastWeek.delta} treino{lastWeek.delta !== 1 ? 's'  : ''}</strong> a mais que semana passada</>
              : <><strong style={{ color: '#f87171' }}>{lastWeek.delta} treino{Math.abs(lastWeek.delta) !== 1 ? 's' : ''}</strong> a menos que semana passada</>
            }
          </p>
        </div>
      )}

      {/* Quick actions — SVG icons instead of emoji */}
      <div className="grid grid-cols-2 gap-3">
        {QUICK_ACTIONS.map(q => (
          <button key={q.path} onClick={() => navigate(`/app/${q.path}`)}
            className="glass-card p-3 flex items-center gap-3 transition-all text-left active:scale-[.98]"
            style={{ cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),.4)'; e.currentTarget.querySelector('.qa-icon').style.color = q.accent }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.querySelector('.qa-icon').style.color = q.accent }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 qa-icon"
              style={{ background: q.color, color: q.accent }}>
              {q.icon}
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{q.label}</span>
          </button>
        ))}
      </div>

      {/* Calendar */}
      <div className="f-card p-4 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => changeMonth(-1)} className="p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-3)' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <span className="font-display text-lg uppercase tracking-widest" style={{ color: 'var(--text-1)' }}>
            {MONTHS[calMonth]} {calYear}
          </span>
          <button onClick={() => changeMonth(1)} className="p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-3)' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {DAYS_ABR.map((d, i) => (
            <div key={i} className="text-center text-xs font-semibold uppercase tracking-wider py-1"
              style={{ color: 'rgba(var(--accent-rgb),.5)' }}>{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`}/>)}
          {Array.from({ length: daysInM }, (_, i) => i + 1).map(d => {
            const k       = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
            const trained = trainedDates.includes(k)
            const isToday = k === todayKey
            return (
              <div key={d}
                onClick={trained ? () => setOpenLogDate(k) : undefined}
                role={trained ? 'button' : undefined}
                aria-label={trained ? `Ver treino de ${d}/${calMonth + 1}` : undefined}
                className="aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all"
                style={{
                  background: trained ? AC : isToday ? 'rgba(var(--accent-rgb),.1)' : 'transparent',
                  color:      trained ? '#fff' : isToday ? AC : 'var(--text-3)',
                  fontWeight: (trained || isToday) ? 700 : 400,
                  border:     isToday && !trained ? `1.5px solid ${AC}` : '1.5px solid transparent',
                  boxShadow:  trained ? '0 0 10px rgba(var(--accent-rgb),.3)' : 'none',
                  cursor:     trained ? 'pointer' : 'default',
                }}>
                {d}
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between mt-3 pt-3"
          style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: AC }}/>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>Treinou</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border" style={{ borderColor: AC }}/>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>Hoje</span>
            </div>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>
            <span style={{ color: AC, fontWeight: 700 }}>{monthCount}</span> treinos este mês
          </span>
        </div>
      </div>

      {/* Weekly overview */}
      <div className="home-schedule">
        <p className="font-display text-base uppercase tracking-widest mb-3"
          style={{ color: 'var(--text-3)' }}>Semana Atual</p>
        <div className="schedule-grid space-y-2">
          {weekDays.map(({ date, dayIndex, plan, isToday, trained }) => {
            // "Descanso" chega de duas formas dependendo do dia: às vezes plan
            // é null (sem rotina no dia), às vezes é um plano de verdade com
            // name:'Descanso' (e um exercício de mobilidade/alongamento
            // dentro). Antes cada caminho tinha um visual diferente — um
            // esmaecido a 25%, outro com o mesmo peso de PUSH/UPPER — e só o
            // segundo mostrava contagem de exercício, no singular errado
            // quando dava 1 ("1 exercícios"). Unificado: mesmo visual sempre,
            // sem contagem em dia de descanso (não faz sentido pra esse caso).
            const isRestDay = !plan?.name || plan.name === 'Descanso'
            const exCount = plan?.exercises?.length || 0
            return (
            <div key={dayIndex} className="f-card px-4 py-3 flex items-center gap-3 transition-all"
              style={isToday ? { borderColor: 'rgba(var(--accent-rgb),.4)', background: 'rgba(var(--accent-rgb),.04)' } : {}}>
              <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                style={{
                  background: trained ? AC : isToday ? 'rgba(var(--accent-rgb),.15)' : 'var(--surface)',
                  border: `1px solid ${trained || isToday ? AC : 'var(--border)'}`,
                  boxShadow: trained ? '0 0 10px rgba(var(--accent-rgb),.3)' : 'none',
                }}>
                <span className="text-xs font-semibold uppercase"
                  style={{ color: trained ? '#fff' : isToday ? AC : 'var(--text-3)' }}>
                  {['D','S','T','Q','Q','S','S'][dayIndex]}
                </span>
                <span className="font-display text-sm"
                  style={{ color: trained ? '#fff' : isToday ? AC : 'var(--text-1)' }}>
                  {date.getDate()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                {isRestDay
                  ? <p className="font-semibold text-sm" style={{ color: isToday ? AC : 'var(--text-1)' }}>Descanso</p>
                  : <>
                      <p className="font-semibold text-sm truncate"
                        style={{ color: isToday ? AC : 'var(--text-1)' }}>
                        {plan.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                        {exCount} exercício{exCount === 1 ? '' : 's'}
                      </p>
                    </>
                }
              </div>
              {trained && (
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"
                  stroke={AC} strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
              {isToday && !trained && plan?.name && (
                <button onClick={() => navigate('/app/workout')}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white whitespace-nowrap"
                  style={{ background: AC }}>
                  Iniciar
                </button>
              )}
            </div>
            )
          })}
        </div>
      </div>
    </div>

    {openLogDate && (
      <WorkoutLogModal userId={user.id} date={openLogDate} onClose={() => setOpenLogDate(null)}/>
    )}
    </>
  )
}
