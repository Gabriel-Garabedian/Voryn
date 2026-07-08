import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { workoutLogService } from '@/services'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/Toast'
import { SkeletonList } from '@/components/ui/Skeleton'
import { localDateKey } from '@/utils/helpers'

const sb = supabase  // alias usado internamente para chamadas diretas ao DB

const DAYS_GOAL_OPTIONS = [2, 3, 4, 5, 6]

async function getBodyLogs(userId) {
  // Sem try/catch, uma falha de rede aqui rejeitava a Promise e o loading
  // ficava travado para sempre, já que setLoading(false) está dentro deste
  // mesmo .then() no useEffect que chama esta função.
  try {
    const { data } = await supabase
      .from('assessments')
      .select('date, weight, body_fat, notes')
      .eq('student_id', userId)
      .order('date', { ascending: false })
      .limit(20)
    return data || []
  } catch (err) {
    console.error('[Voryn] getBodyLogs falhou (rede/parse):', err)
    return []
  }
}

async function saveBodyLog(userId, entry) {
  const { data, error } = await supabase
    .from('assessments')
    .insert({ student_id: userId, ...entry })
    .select().single()
  return { data, error }
}

function WeeklyGoalRing({ current, goal }) {
  const pct = Math.min(current / goal, 1)
  const r   = 44
  const circ = 2 * Math.PI * r
  const met = pct >= 1

  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg className="w-full h-full" style={{ transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--border)" strokeWidth="8"/>
        <circle cx="50" cy="50" r={r} fill="none"
          stroke={met ? '#4ade80' : 'var(--accent)'}
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ - pct * circ}
          style={{ transition: 'stroke-dashoffset .8s ease, stroke .3s' }}/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl leading-none" style={{ color: met ? '#4ade80' : 'var(--accent)' }}>
          {current}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>/{goal}</span>
      </div>
    </div>
  )
}

export default function GoalsView() {
  const { user, profile, updateProfile } = useAuth()
  const toast = useToast()
  const [weeklyGoal,  setWeeklyGoal]  = useState(profile?.weekly_goal || 3)
  const [weekCount,   setWeekCount]   = useState(0)
  const [bodyLogs,    setBodyLogs]    = useState([])
  const [goals,       setGoals]       = useState(null)
  const [goalForm,    setGoalForm]    = useState({ target_weight: '', target_body_fat: '', weekly_sessions: 3, target_date: '', notes: '' })
  const [showGoalEdit,setShowGoalEdit]= useState(false)
  const [showAddBody, setShowAddBody] = useState(false)
  const [bodyForm,    setBodyForm]    = useState({ date: localDateKey(), weight: '', body_fat: '', notes: '' })
  const [saving,      setSaving]      = useState(false)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!user) return
    // Count this week's workouts
    workoutLogService.getTrainedDates(user.id).then(dates => {
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0,0,0,0)
      const count = dates.filter(d => new Date(d) >= weekStart).length
      setWeekCount(count)
    })
    getBodyLogs(user.id).then(logs => { setBodyLogs(logs); setLoading(false) })
    sb.from('student_goals').select('*').eq('student_id', user.id).single()
      .then(({ data }) => {
        if (data) { setGoals(data); setGoalForm(f => ({ ...f, ...data })) }
      })
      .catch(err => console.error('[Voryn] GoalsView: falha ao carregar student_goals:', err))
  }, [user])

  async function saveGoal(val) {
    setWeeklyGoal(val)
    await updateProfile({ weekly_goal: val })
    toast.success(`Meta atualizada: ${val}×/semana`)
  }

  async function saveGoalDetails() {
    const payload = {
      student_id:      user.id,
      target_weight:   goalForm.target_weight   ? parseFloat(goalForm.target_weight)   : null,
      target_body_fat: goalForm.target_body_fat ? parseFloat(goalForm.target_body_fat) : null,
      weekly_sessions: goalForm.weekly_sessions || 3,
      target_date:     goalForm.target_date || null,
      notes:           goalForm.notes || null,
      updated_at:      new Date().toISOString(),
    }
    const { data, error } = await sb.from('student_goals')
      .upsert(payload, { onConflict: 'student_id' }).select().single()
    if (!error) { setGoals(data); setShowGoalEdit(false); toast.success('Metas salvas!') }
    else toast.error('Erro ao salvar metas.')
  }

  async function addBodyLog() {
    if (!bodyForm.weight && !bodyForm.notes) return
    setSaving(true)
    const { data } = await saveBodyLog(user.id, bodyForm)
    if (data) { setBodyLogs(l => [data, ...l]); toast.success('Registro salvo!') }
    setShowAddBody(false)
    setBodyForm({ date: localDateKey(), weight: '', body_fat: '', notes: '' })
    setSaving(false)
  }

  const goalMet    = weekCount >= weeklyGoal
  const lastWeight = bodyLogs.find(l => l.weight)?.weight
  const prevWeight = bodyLogs.slice(1).find(l => l.weight)?.weight
  const weightDiff = lastWeight && prevWeight ? (parseFloat(lastWeight) - parseFloat(prevWeight)).toFixed(1) : null

  if (loading) return (
    <div className="px-4 pt-6 pb-8">
      <div className="skeleton-pulse h-8 w-32 rounded-lg mb-2" style={{ background: 'var(--border)' }}/>
      <div className="skeleton-pulse h-4 w-20 rounded mb-6" style={{ background: 'var(--border)' }}/>
      <SkeletonList count={3}/>
    </div>
  )

  return (
    <div className="px-4 pt-6 pb-8 space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>Metas</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Acompanhe seu progresso semanal</p>
      </div>

      {/* Weekly goal ring */}
      <div className="f-card p-6" style={goalMet ? { borderColor: 'rgba(74,222,128,.4)', background: 'rgba(74,222,128,.03)' } : {}}>
        <p className="text-xs font-semibold uppercase tracking-widest text-center mb-4" style={{ color: 'var(--text-3)' }}>
          Meta Semanal
        </p>
        <WeeklyGoalRing current={weekCount} goal={weeklyGoal}/>
        <p className="text-center mt-3 font-semibold text-sm" style={{ color: goalMet ? '#4ade80' : 'var(--text-1)' }}>
          {goalMet ? '🎉 Meta atingida esta semana!' : `Faltam ${weeklyGoal - weekCount} treino${weeklyGoal - weekCount !== 1 ? 's' : ''} para sua meta`}
        </p>

        {/* Goal selector */}
        <div className="mt-5">
          <p className="text-xs text-center mb-3" style={{ color: 'var(--text-3)' }}>Meta semanal de treinos</p>
          <div className="flex justify-center gap-2">
            {DAYS_GOAL_OPTIONS.map(d => (
              <button key={d} onClick={() => saveGoal(d)}
                className="w-10 h-10 rounded-xl font-display text-lg transition-all"
                style={{
                  background: weeklyGoal===d ? 'var(--accent)' : 'var(--surface)',
                  color:      weeklyGoal===d ? '#fff'          : 'var(--text-3)',
                  border:     `1px solid ${weeklyGoal===d ? 'var(--accent)' : 'var(--border)'}`,
                  boxShadow:  weeklyGoal===d ? '0 0 12px rgba(var(--accent-rgb),.3)' : 'none',
                }}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body tracking */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="f-label">Peso & Composição Corporal</p>
            {lastWeight && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                Atual: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{lastWeight}kg</span>
                {weightDiff && (
                  <span style={{ color: parseFloat(weightDiff) < 0 ? '#4ade80' : '#f87171', marginLeft: 6 }}>
                    {parseFloat(weightDiff) > 0 ? '+' : ''}{weightDiff}kg
                  </span>
                )}
              </p>
            )}
          </div>
          <button onClick={() => setShowAddBody(!showAddBody)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(var(--accent-rgb),.1)', color: 'var(--accent)', border: '1px solid rgba(var(--accent-rgb),.2)' }}>
            + Registrar
          </button>
        </div>

        {showAddBody && (
          <div className="f-card p-4 space-y-3 mb-3 scale-in" style={{ borderColor: 'rgba(var(--accent-rgb),.3)' }}>
            <p className="font-display text-base uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
              Novo Registro
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="f-label">Data</label>
                <input type="date" className="f-input py-2 text-sm" value={bodyForm.date}
                  onChange={e => setBodyForm(f => ({ ...f, date: e.target.value }))}/>
              </div>
              <div>
                <label className="f-label">Peso (kg)</label>
                <input type="number" inputMode="decimal" className="f-input py-2 text-sm text-center"
                  placeholder="75.5" value={bodyForm.weight}
                  onChange={e => setBodyForm(f => ({ ...f, weight: e.target.value }))}/>
              </div>
              <div>
                <label className="f-label">% Gordura</label>
                <input type="number" inputMode="decimal" className="f-input py-2 text-sm text-center"
                  placeholder="18" value={bodyForm.body_fat}
                  onChange={e => setBodyForm(f => ({ ...f, body_fat: e.target.value }))}/>
              </div>
            </div>
            <div>
              <label className="f-label">Notas</label>
              <input className="f-input text-sm" placeholder="Observações..." value={bodyForm.notes}
                onChange={e => setBodyForm(f => ({ ...f, notes: e.target.value }))}/>
            </div>
            <div className="flex gap-2">
              <button onClick={addBodyLog} disabled={saving}
                className="f-btn f-btn-accent flex-1 py-2.5 text-sm disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setShowAddBody(false)} className="f-btn f-btn-ghost px-4">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {bodyLogs.length === 0 && !showAddBody ? (
          <div className="f-card p-6 text-center">
            <div className="text-3xl mb-2">⚖️</div>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Nenhum registro ainda.</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Registre seu peso para acompanhar sua evolução.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bodyLogs.slice(0, 8).map((log, i) => (
              <div key={log.id || i} className="f-card px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <span className="font-display text-sm" style={{ color: 'var(--accent)' }}>
                    {log.date?.slice(8)}
                  </span>
                  <span className="text-xs uppercase" style={{ color: 'var(--text-3)' }}>
                    {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(log.date?.slice(5,7))-1]}
                  </span>
                </div>
                <div className="flex-1">
                  {log.weight && (
                    <span className="font-display text-lg" style={{ color: 'var(--accent)' }}>{log.weight}kg</span>
                  )}
                  {log.body_fat && (
                    <span className="text-sm ml-2" style={{ color: 'var(--text-3)' }}>{log.body_fat}% gordura</span>
                  )}
                  {log.notes && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{log.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
