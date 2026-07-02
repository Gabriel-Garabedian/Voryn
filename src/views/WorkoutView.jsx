import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { routineService, workoutLogService, activeWorkoutService } from '@/services'
import { Button } from '@/components/ui'
import PostWorkoutModal from '@/components/PostWorkoutModal'
import ExercisePicker from '@/components/ExercisePicker'
import ExerciseDetail from '@/components/ExerciseDetail'
import { EXERCISE_LIBRARY } from '@/data/exercises'
import { useToast } from '@/components/ui/Toast'
import { captureError } from '@/lib/sentry'

const DAYS_FULL = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
const AC = 'var(--accent)'
const genId = () => Math.random().toString(36).slice(2, 9)

// ── Rest Timer Overlay ─────────────────────────────────────
function RestTimer({ seconds, onSkip, seriesDone }) {
  const [rem,     setRem]     = useState(seconds)
  const [visible, setVisible] = useState(false)
  const circ = 2 * Math.PI * 44
  const prog = (rem / seconds) * circ
  const warn = rem <= 10

  // Smooth entrance after 300ms
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (rem <= 0) { onSkip(); return }
    const t = setTimeout(() => setRem(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [rem, onSkip])

  useEffect(() => {
    if (rem === 0 && navigator.vibrate) navigator.vibrate([200, 100, 200])
  }, [rem])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: 'rgba(8,8,8,.97)', backdropFilter: 'blur(20px)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity .3s ease, transform .35s cubic-bezier(.34,1.2,.64,1)',
      }}>
      {/* "Série concluída!" badge */}
      <div className="mb-6 px-4 py-2 rounded-full text-xs font-semibold animate-slide-up"
        style={{ background: 'rgba(74,222,128,.12)', border: '1px solid rgba(74,222,128,.3)', color: '#4ade80' }}>
        ✅ Série {seriesDone} concluída!
      </div>
      <p className="font-display text-lg uppercase tracking-widest mb-6" style={{ color: 'var(--text-3)' }}>
        Descansando
      </p>
      <div className="relative w-44 h-44">
        <svg className="w-full h-full" style={{ transform: 'rotate(-90deg)' }} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="var(--card)" strokeWidth="6"/>
          <circle cx="50" cy="50" r="44" fill="none"
            stroke={warn ? '#ef4444' : AC}
            strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ - prog}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke .3s' }}/>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-5xl" style={{ color: warn ? '#ef4444' : AC }}>{rem}</span>
          <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>seg</span>
        </div>
      </div>
      {warn && (
        <p className="text-sm font-semibold mt-4 animate-pulse" style={{ color: '#ef4444' }}>
          Prepare-se!
        </p>
      )}
      <Button className="mt-6 px-10" onClick={onSkip}>Pular descanso</Button>
      <p className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>
        {rem > 0 ? `Próxima série em ${rem}s...` : 'Pronto!'}
      </p>
    </div>
  )
}

// ── No Workout selector ────────────────────────────────────
function NoWorkout({ user, onStart }) {
  const [routines, setRoutines] = useState({})
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    routineService.getAll(user.id).then(({ data }) => { setRoutines(data || {}); setLoading(false) })
      .catch(err => { console.error('[Voryn] WorkoutView (NoWorkout) falhou ao carregar rotinas:', err); setLoading(false) })
  }, [user.id])

  const today     = new Date().getDay()
  const todayPlan = routines[today]
  const others    = Object.entries(routines)
    .filter(([k, v]) => parseInt(k) !== today && v?.exercises?.length)

  if (loading) return (
    <div className="px-4 pt-6 pb-8">
      <div className="skeleton-pulse h-8 w-32 rounded-lg mb-2" style={{ background: 'var(--border)' }}/>
      <div className="skeleton-pulse h-4 w-24 rounded mb-6" style={{ background: 'var(--border)' }}/>
      <div className="space-y-3">
        {[...Array(3)].map((_,i) => <div key={i} className="skeleton-pulse h-20 rounded-xl" style={{ background: 'var(--border)' }}/>)}
      </div>
    </div>
  )

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
          Em Treino
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Selecione um treino para iniciar</p>
      </div>

      {todayPlan?.exercises?.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
            Treino de hoje
          </p>
          <button onClick={() => onStart(today)}
            className="w-full f-card p-4 text-left flex items-center gap-4 transition-all"
            style={{ borderColor: 'rgba(var(--accent-rgb),.4)', background: 'rgba(var(--accent-rgb),.05)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: AC, boxShadow: '0 0 20px rgba(var(--accent-rgb),.4)' }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </div>
            <div>
              <p className="font-display text-lg uppercase tracking-wide" style={{ color: AC }}>
                {todayPlan.name || DAYS_FULL[today]}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                {todayPlan.exercises.length} exercícios · {DAYS_FULL[today]}
              </p>
            </div>
          </button>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-3)' }}>
            Outros treinos
          </p>
          <div className="space-y-2">
            {others.map(([k, v]) => (
              <button key={k} onClick={() => onStart(parseInt(k))}
                className="w-full f-card p-4 text-left flex items-center gap-4 transition-all">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24"
                    stroke="var(--muted)" strokeWidth="1.8">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </div>
                <div>
                  <p className="font-display text-base uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
                    {v.name || DAYS_FULL[parseInt(k)]}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                    {v.exercises.length} exercícios · {DAYS_FULL[parseInt(k)]}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!todayPlan && others.length === 0 && (
        <div className="f-card p-8 text-center space-y-3">
          <div className="text-4xl">🏋️</div>
          <p className="font-semibold" style={{ color: 'var(--text-1)' }}>Nenhum treino planejado</p>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Vá em Rotina para criar seus treinos.</p>
        </div>
      )}
    </div>
  )
}

// ── Main Active Workout ────────────────────────────────────
export default function WorkoutView() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [workout,      setWorkout]      = useState(() => activeWorkoutService.get())
  const [restSecs,     setRestSecs]     = useState(60)
  const [showRest,     setShowRest]     = useState(false)
  const [elapsed,      setElapsed]      = useState(0)
  const [confirm,      setConfirm]      = useState(false)
  const [showSummary,  setShowSummary]  = useState(false)
  const [finishedData, setFinishedData] = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [lastSeriesDone, setLastSeriesDone] = useState(0)
  const [showExPicker,  setShowExPicker]  = useState(false)
  const [detailExercise, setDetailExercise] = useState(null) // instruções durante o treino
  const [openNotes,     setOpenNotes]     = useState({}) // { [exerciseIndex]: boolean } — bloco de anotação expandido ou não
  const toast = useToast()
  const timerRef = useRef(null)

  useEffect(() => {
    if (workout?.startTime) setElapsed(Math.floor((Date.now() - workout.startTime) / 1000))
  }, [workout?.startTime])

  useEffect(() => {
    if (!workout) return
    timerRef.current = setInterval(
      () => setElapsed(Math.floor((Date.now() - workout.startTime) / 1000)), 1000
    )
    return () => clearInterval(timerRef.current)
  }, [workout?.startTime])

  async function startWorkout(dayIndex) {
    const { data: rts } = await routineService.getAll(user.id)
    const plan = rts?.[dayIndex]
    if (!plan) return
    const w = {
      id: genId(), dayIndex, name: plan.name || DAYS_FULL[dayIndex],
      startTime: Date.now(),
      exercises: plan.exercises.map(ex => ({
        ...ex,
        sets: Array.from({ length: ex.sets }, () => ({
          id: genId(), reps: '', weight: '', done: false
        }))
      }))
    }
    activeWorkoutService.save(w)
    setWorkout(w)
  }

  function updateSet(ei, si, field, val) {
    const updated = {
      ...workout,
      exercises: workout.exercises.map((ex, eii) =>
        eii !== ei ? ex : {
          ...ex,
          sets: ex.sets.map((s, sii) => sii !== si ? s : { ...s, [field]: val })
        }
      )
    }
    activeWorkoutService.save(updated)
    setWorkout(updated)
  }

  function toggleDone(ei, si) {
    const wasDone = workout.exercises[ei].sets[si].done
    const updated = {
      ...workout,
      exercises: workout.exercises.map((ex, eii) =>
        eii !== ei ? ex : {
          ...ex,
          sets: ex.sets.map((s, sii) => sii !== si ? s : { ...s, done: !s.done })
        }
      )
    }
    activeWorkoutService.save(updated)
    setWorkout(updated)
    if (!wasDone) setLastSeriesDone((prev) => prev + 1)
    setShowRest(true)
  }

  function addSet(ei) {
    const updated = {
      ...workout,
      exercises: workout.exercises.map((ex, eii) =>
        eii !== ei ? ex : {
          ...ex,
          sets: [...ex.sets, { id: genId(), reps: '', weight: '', done: false }]
        }
      )
    }
    activeWorkoutService.save(updated)
    setWorkout(updated)
  }

  // Anotação livre por exercício (ex: "peguei mais leve, ombro incomodando"
  // ou "consegui aumentar a carga, próxima semana subir mais"). Fica salva
  // dentro do próprio objeto do exercício no exercises[], então é
  // persistida em workout_logs.exercises (jsonb) junto com o resto do
  // treino ao finalizar — sem precisar de coluna nova no banco. Isso é o
  // que faz a nota aparecer depois no Histórico, tanto para o aluno quanto
  // para o personal olhando a evolução dele (ver EvolutionView/HistoryView
  // e o card do personal em PersonalDashboardView).
  function updateNote(ei, val) {
    const updated = {
      ...workout,
      exercises: workout.exercises.map((ex, eii) => eii !== ei ? ex : { ...ex, notes: val })
    }
    activeWorkoutService.save(updated)
    setWorkout(updated)
  }

  const skipRest = useCallback(() => setShowRest(false), [])

  async function finishWorkout() {
    if (!workout) return
    setSaving(true)
    const duration = Math.floor((Date.now() - workout.startTime) / 1000)
    const now = new Date()
    const dateKey = now.toISOString().split('T')[0]

    const { error } = await workoutLogService.create(user.id, {
      name: workout.name,
      date: dateKey,
      dayIndex: workout.dayIndex,
      duration,
      exercises: workout.exercises,
    })

    // Se o save falhar (rede, RLS, etc.), NÃO limpamos o treino do
    // localStorage — sem essa checagem, o app seguia como se tivesse dado
    // certo, apagava o treino salvo localmente e mostrava a tela de "treino
    // concluído", e a pessoa só descobria que perdeu o treino inteiro ao
    // procurar por ele no histórico depois.
    if (error) {
      captureError(error, { context: 'finish_workout', userId: user?.id })
      setSaving(false)
      setConfirm(false)
      toast.error('Não foi possível salvar o treino. Verifique sua conexão e tente novamente — seus dados não foram perdidos.')
      return
    }

    clearInterval(timerRef.current)
    setFinishedData({ ...workout })
    activeWorkoutService.clear()
    setWorkout(null)
    setShowSummary(true)
    setSaving(false)
    setConfirm(false)
  }

  function handleSummaryClose() {
    setShowSummary(false)
    setFinishedData(null)
    navigate('/app')
  }

  const fmt = s => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  // Exercise picker overlay
  if (showExPicker) {
    return (
      <ExercisePicker
        onSelect={ex => {
          const newEx = {
            id:      `ex_${Date.now()}`,
            name:    ex.name,
            muscle:  ex.muscle || '',
            sets:    [{ id: `s_${Date.now()}`, reps: '', weight: '', done: false }],
          }
          setWorkout(w => {
            const updated = { ...w, exercises: [...w.exercises, newEx] }
            activeWorkoutService.save(updated)
            return updated
          })
          setShowExPicker(false)
          toast.success(`${ex.name} adicionado! 💪`)
        }}
        onClose={() => setShowExPicker(false)}
        onCustom={name => {
          const newEx = {
            id:   `ex_${Date.now()}`,
            name, muscle: '',
            sets: [{ id: `s_${Date.now()}`, reps: '', weight: '', done: false }],
          }
          setWorkout(w => {
            const updated = { ...w, exercises: [...w.exercises, newEx] }
            activeWorkoutService.save(updated)
            return updated
          })
          setShowExPicker(false)
          toast.success(`${name} adicionado!`)
        }}
      />
    )
  }

  // Post workout summary modal
  if (showSummary && finishedData) {
    return (
      <PostWorkoutModal
        workout={finishedData}
        elapsed={Math.floor((Date.now() - finishedData.startTime) / 1000)}
        onClose={handleSummaryClose}
      />
    )
  }

  if (!workout) return <NoWorkout user={user} onStart={startWorkout} />

  const totalSets = workout.exercises.reduce((a, ex) => a + ex.sets.length, 0)
  const doneSets  = workout.exercises.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0)

  return (
    <div className="pb-8">
      {showRest && <RestTimer seconds={restSecs} onSkip={skipRest} seriesDone={lastSeriesDone || 1} />}

      {detailExercise && (
        <ExerciseDetail
          exercise={detailExercise}
          onAdd={() => setDetailExercise(null)} // durante o treino, "adicionar" só fecha — já está na rotina
          onClose={() => setDetailExercise(null)}
          buttonLabel="Entendi, voltar ao treino"
        />
      )}

      {/* Header */}
      <div className="px-4 pt-6 pb-4"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
              Em Treino
            </p>
            <h2 className="font-display text-2xl uppercase tracking-wide leading-tight"
              style={{ color: 'var(--text-1)' }}>
              {workout.name}
            </h2>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl" style={{ color: AC }}>{fmt(elapsed)}</div>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>duração</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${totalSets > 0 ? (doneSets / totalSets) * 100 : 0}%`,
                background: AC,
                boxShadow: doneSets > 0 ? '0 0 8px rgba(var(--accent-rgb),.5)' : 'none',
              }}/>
          </div>
          <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
            {doneSets}/{totalSets} séries
          </span>
        </div>

        {/* Rest timer config */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>Descanso:</span>
          {[30, 60, 90, 120, 180].map(s => (
            <button key={s} onClick={() => setRestSecs(s)}
              className="px-2 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: restSecs === s ? AC : 'var(--surface)',
                color: restSecs === s ? '#fff' : 'var(--text-3)',
                border: `1px solid ${restSecs === s ? AC : 'var(--border)'}`,
              }}>
              {s >= 60 ? `${s/60}min` : `${s}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Exercises */}
      <div className="px-4 pt-4 space-y-4">
        {workout.exercises.map((ex, ei) => {
          const exDone = ex.sets.every(s => s.done)
          const doneCount = ex.sets.filter(s => s.done).length
          return (
            <div key={ex.id} className="f-card overflow-hidden"
              style={exDone ? { borderColor: 'rgba(var(--accent-rgb),.4)' } : {}}>

              {/* Exercise header */}
              <div className="px-4 py-3 flex items-center gap-3"
                style={{
                  background: exDone ? 'rgba(var(--accent-rgb),.05)' : 'var(--surface)',
                  borderBottom: '1px solid var(--border)',
                }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: exDone ? AC : 'var(--card)',
                    border: `1px solid ${exDone ? AC : 'var(--border)'}`,
                  }}>
                  {exDone
                    ? <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    : <span className="font-display text-xs" style={{ color: AC }}>{ei + 1}</span>
                  }
                </div>
                <button onClick={() => {
                    const libMatch = EXERCISE_LIBRARY.find(le => le.name === ex.name)
                    setDetailExercise(libMatch || { name: ex.name, muscle: ex.muscle || 'Outro', equipment: 'Livre', type: 'compound' })
                  }}
                  className="font-semibold text-sm flex-1 text-left flex items-center gap-1.5"
                  style={{ color: exDone ? AC : 'var(--text-1)' }}>
                  {ex.name}
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                  </svg>
                </button>
                <span className="text-xs font-semibold" style={{ color: exDone ? AC : 'var(--text-3)' }}>
                  {exDone ? 'Concluído ✓' : `${doneCount}/${ex.sets.length}`}
                </span>
              </div>

              {/* Sets */}
              <div className="px-4 pt-2 pb-3">
                {/* Header row */}
                <div className="grid grid-cols-[28px_1fr_1fr_36px] gap-2 mb-2">
                  {['S', 'Reps', 'kg', '✓'].map((h, i) => (
                    <div key={i} className="text-xs font-semibold uppercase tracking-wider text-center"
                      style={{ color: 'var(--text-3)' }}>{h}</div>
                  ))}
                </div>

                {/* Set rows */}
                <div className="space-y-2">
                  {ex.sets.map((set, si) => (
                    <div key={set.id}
                      className="workout-set-row grid grid-cols-[28px_1fr_1fr_36px] gap-2 items-center"
                      style={{ opacity: set.done ? .55 : 1 }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto font-display text-xs"
                        style={{
                          background: set.done ? 'rgba(var(--accent-rgb),.15)' : 'var(--surface)',
                          border: '1px solid var(--border)',
                          color: set.done ? AC : 'var(--text-3)',
                        }}>
                        {si + 1}
                      </div>
                      <input type="text" inputMode="numeric" className="f-input py-2 text-center text-sm"
                        placeholder="—" value={set.reps} disabled={set.done}
                        onChange={e => updateSet(ei, si, 'reps', e.target.value)}/>
                      <input type="text" inputMode="decimal" className="f-input py-2 text-center text-sm"
                        placeholder="—" value={set.weight} disabled={set.done}
                        onChange={e => updateSet(ei, si, 'weight', e.target.value)}/>
                      <button onClick={() => toggleDone(ei, si)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto transition-all"
                        style={{
                          background: set.done ? AC : 'transparent',
                          border: `2px solid ${set.done ? AC : 'var(--border)'}`,
                          boxShadow: set.done ? '0 0 10px rgba(var(--accent-rgb),.35)' : 'none',
                        }}>
                        {set.done && (
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24"
                            stroke="white" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add set */}
                <button onClick={() => addSet(ei)}
                  className="w-full mt-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1 transition-all"
                  style={{ border: '1px dashed var(--border)', color: 'rgba(var(--accent-rgb),.35)' }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  adicionar série
                </button>

                {/* Anotação do exercício — fica salva junto com o treino e
                    aparece depois no Histórico, para o aluno e o personal. */}
                {openNotes[ei] || ex.notes ? (
                  <div className="mt-2">
                    <textarea
                      className="f-input text-xs py-2 resize-none"
                      rows={2}
                      placeholder="Como foi esse exercício? Ex: reduzi a carga, ombro incomodou, consegui subir peso..."
                      value={ex.notes || ''}
                      onChange={e => updateNote(ei, e.target.value)}
                      onBlur={() => { if (!ex.notes) setOpenNotes(o => ({ ...o, [ei]: false })) }}
                    />
                  </div>
                ) : (
                  <button onClick={() => setOpenNotes(o => ({ ...o, [ei]: true }))}
                    className="w-full mt-2 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all"
                    style={{ color: 'var(--text-3)' }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    adicionar anotação
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add exercise mid-workout */}
      <div className="px-4 mt-4">
        <button onClick={() => setShowExPicker(true)}
          className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all"
          style={{ border: '1px dashed rgba(var(--accent-rgb),.3)', color: 'rgba(var(--accent-rgb),.5)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(var(--accent-rgb),.6)'; e.currentTarget.style.color='var(--accent)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(var(--accent-rgb),.3)'; e.currentTarget.style.color='rgba(var(--accent-rgb),.5)' }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          Adicionar exercício
        </button>
      </div>

      {/* Finish */}
      <div className="px-4 mt-6 space-y-2">
        {confirm ? (
          <div className="f-card p-4 space-y-3 scale-in"
            style={{ borderColor: 'rgba(var(--accent-rgb),.35)' }}>
            <p className="text-sm font-semibold text-center" style={{ color: 'var(--text-1)' }}>
              Finalizar treino agora?
            </p>
            <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
              {doneSets}/{totalSets} séries concluídas · {fmt(elapsed)}
            </p>
            <div className="flex gap-2">
              <Button className="flex-1 py-3 text-sm" loading={saving} onClick={finishWorkout}>
                Finalizar ✓
              </Button>
              <Button variant="ghost" className="px-5" onClick={() => setConfirm(false)}>
                Voltar
              </Button>
            </div>
            <button
              onClick={() => { activeWorkoutService.clear(); setWorkout(null); navigate('/app') }}
              className="w-full text-center text-xs transition-colors"
              style={{ color: 'rgba(239,68,68,.4)' }}>
              Cancelar treino (sem salvar)
            </button>
          </div>
        ) : (
          <Button size="xl" onClick={() => setConfirm(true)}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Finalizar Treino
          </Button>
        )}
      </div>
    </div>
  )
}
