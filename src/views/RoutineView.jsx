import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { routineService } from '@/services'
import { Button } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { SkeletonList } from '@/components/ui/Skeleton'
import ExercisePicker from '@/components/ExercisePicker'

const DAYS_FULL  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
const DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const AC = 'var(--accent)'

function genId() { return Math.random().toString(36).slice(2,9) }

// RoutineView é usado tanto pelo próprio aluno (rota /app/routine, sem props)
// quanto pelo personal editando a ficha de um aluno (embeddedUserId).
// Quando embeddedUserId é passado, todas as operações de leitura/escrita
// usam esse id em vez do usuário logado — e o cabeçalho/empty states mudam
// de "Minha Rotina" para deixar claro que é a ficha de outra pessoa.
export default function RoutineView({ embeddedUserId, embeddedName, onClose }) {
  const { user } = useAuth()
  const targetUserId = embeddedUserId || user?.id
  const isEmbedded = Boolean(embeddedUserId)
  const toast = useToast()
  const [routines,      setRoutines]      = useState({})
  const [selectedDay,   setSelectedDay]   = useState(new Date().getDay())
  const [showPicker,    setShowPicker]    = useState(false)
  const [editName,      setEditName]      = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [editingEx,     setEditingEx]     = useState(null) // {exId, sets, reps, notes}
  const [trainerName,   setTrainerName]   = useState(null)

  useEffect(() => {
    if (!targetUserId) return
    routineService.getAll(targetUserId).then(({ data }) => {
      setRoutines(data || {})
      setLoading(false)
    }).catch(err => {
      console.error('[Voryn] RoutineView falhou ao carregar:', err)
      setLoading(false)
    })
  }, [targetUserId])

  // Nome do personal para o badge "Montada por" — created_by é gravado há
  // tempo (ver persist abaixo) mas nunca era lido em lugar nenhum: o aluno
  // não tinha como saber, olhando a própria ficha, se foi ele mesmo que
  // montou ou se foi o personal. Só busca quando de fato existe alguma
  // rotina com created_by preenchido e não é o próprio aluno olhando a
  // ficha de outra pessoa (isEmbedded já mostra o nome do aluno no header).
  useEffect(() => {
    if (isEmbedded || !user) return
    const anyTrainerCreated = Object.values(routines).some(r => r?.created_by)
    if (!anyTrainerCreated) { setTrainerName(null); return }
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.from('trainer_students')
        .select('trainer:trainers(user:users(name))')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single()
        .then(({ data }) => setTrainerName(data?.trainer?.user?.name || null))
        .catch(() => setTrainerName(null))
    })
  }, [routines, isEmbedded, user])

  async function persist(dayIndex, updated, msg) {
    setSaving(true)
    // Quando é o personal editando, marcamos created_by para refletir quem
    // de fato montou a ficha — usado pelas policies routines_trainer_write/read
    // no banco, que já existiam mas nunca eram preenchidas por nenhuma tela.
    const payload = isEmbedded ? { ...updated, created_by: user.id } : updated
    const { error } = await routineService.upsert(targetUserId, dayIndex, payload)
    setSaving(false)
    if (error) toast.error('Erro ao salvar. Tente novamente.')
    else if (msg) toast.success(msg)
  }

  function setDayField(dayIndex, field, value) {
    const current = routines[dayIndex] || { name: '', exercises: [] }
    const updated = { ...current, [field]: value }
    setRoutines(r => ({ ...r, [dayIndex]: updated }))
    persist(dayIndex, updated)
  }

  function addExerciseFromLibrary(ex) {
    const current   = routines[selectedDay] || { name: '', exercises: [] }
    const exercises = [...(current.exercises || []), {
      id: genId(), name: ex.name, sets: 3, reps: '10',
      muscle: ex.muscle, equipment: ex.equipment, notes: ''
    }]
    const updated = { ...current, exercises }
    setRoutines(r => ({ ...r, [selectedDay]: updated }))
    persist(selectedDay, updated, `✅ ${ex.name} adicionado!`)
    setShowPicker(false)
  }

  function updateExercise(dayIndex, exId, changes) {
    const current   = routines[dayIndex]
    if (!current) return
    const exercises = current.exercises.map(e => e.id === exId ? { ...e, ...changes } : e)
    const updated   = { ...current, exercises }
    setRoutines(r => ({ ...r, [dayIndex]: updated }))
    persist(dayIndex, updated, 'Exercício atualizado!')
    setEditingEx(null)
  }

  function removeExercise(dayIndex, exId) {
    const current   = routines[dayIndex]
    const ex        = current.exercises.find(e => e.id === exId)
    const exercises = current.exercises.filter(e => e.id !== exId)
    const updated   = { ...current, exercises }
    setRoutines(r => ({ ...r, [dayIndex]: updated }))
    persist(dayIndex, updated, `Removido: ${ex?.name || 'exercício'}`)
  }

  function moveExercise(dayIndex, exId, dir) {
    const current = routines[dayIndex]
    const exs = [...current.exercises]
    const idx = exs.findIndex(e => e.id === exId)
    const ni  = idx + dir
    if (ni < 0 || ni >= exs.length) return
    ;[exs[idx], exs[ni]] = [exs[ni], exs[idx]]
    const updated = { ...current, exercises: exs }
    setRoutines(r => ({ ...r, [dayIndex]: updated }))
    persist(dayIndex, updated)
  }

  async function clearDay(dayIndex) {
    await routineService.delete(targetUserId, dayIndex)
    setRoutines(r => { const n = { ...r }; delete n[dayIndex]; return n })
    toast.info(`${DAYS_FULL[dayIndex]} limpo`)
  }

  const day = routines[selectedDay]

  if (showPicker) {
    return (
      <ExercisePicker
        onSelect={addExerciseFromLibrary}
        onClose={() => setShowPicker(false)}
        onCustom={name => addExerciseFromLibrary({ id: `custom_${Date.now()}`, name, muscle: 'Outro', equipment: 'Livre', type: 'compound' })}
      />
    )
  }

  return (
    <div className="pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
            {isEmbedded ? 'Ficha de Treino' : 'Minha Rotina'}
          </h1>
          <p className="text-sm mt-1 flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
            {isEmbedded ? `Editando a ficha de ${embeddedName || 'aluno'}` : 'Organize sua semana'}
            {saving && (
              <span className="flex items-center gap-1" style={{ color: AC }}>
                <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Salvando...
              </span>
            )}
          </p>
        </div>
        {isEmbedded && onClose && (
          <button onClick={onClose} className="p-2 rounded-xl flex-shrink-0" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>


      {/* Day selector */}
      <div className="px-4 mb-4">
        {!isEmbedded && day?.created_by && trainerName && (
          <div className="flex items-center gap-1.5 mb-3 text-xs" style={{ color: 'var(--text-3)' }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
              <path d="M20 8v6M23 11h-6"/>
            </svg>
            Ficha montada por <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{trainerName}</span>
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {DAYS_SHORT.map((d, i) => {
            const hasPlan = routines[i]?.name || routines[i]?.exercises?.length
            const isSel   = i === selectedDay
            const isToday = i === new Date().getDay()
            return (
              <button key={i}
                onClick={() => { setSelectedDay(i); setEditName(false) }}
                className="flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl transition-all relative"
                style={{
                  background: isSel ? AC : 'var(--card)',
                  border:     `1px solid ${isSel ? AC : 'var(--border)'}`,
                  color:      isSel ? '#fff' : 'var(--text-3)',
                  boxShadow:  isSel ? '0 0 16px rgba(var(--accent-rgb),.35)' : 'none',
                }}>
                {hasPlan && !isSel && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: AC }}/>
                )}
                <span className="text-xs font-semibold uppercase tracking-wider">{d}</span>
                <span className="text-xs">{isToday ? 'Hoje' : `${i+1}°`}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4 space-y-3">
        {loading ? (
          <SkeletonList count={3}/>
        ) : (
          <>
            {/* Name card */}
            <div className="f-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(var(--accent-rgb),.1)', border: '1px solid rgba(var(--accent-rgb),.25)' }}>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={AC} strokeWidth="2">
                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  {editName ? (
                    <input autoFocus className="f-input py-1 text-sm"
                      placeholder="Ex: Peito & Tríceps"
                      value={day?.name || ''}
                      onChange={e => setDayField(selectedDay, 'name', e.target.value)}
                      onBlur={() => { setEditName(false); if (day?.name) toast.success('Nome salvo!') }}
                      onKeyDown={e => { if (e.key === 'Enter') { setEditName(false); if (day?.name) toast.success('Nome salvo!') } }}
                    />
                  ) : (
                    <button className="text-left w-full" onClick={() => setEditName(true)}>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-3)' }}>
                        {DAYS_FULL[selectedDay]}
                      </p>
                      <p className="text-sm font-semibold" style={{ color: day?.name ? 'var(--text-1)' : 'rgba(var(--accent-rgb),.3)' }}>
                        {day?.name || 'Toque para nomear o treino...'}
                      </p>
                    </button>
                  )}
                </div>
                {(day?.name || day?.exercises?.length > 0) && (
                  <button onClick={() => clearDay(selectedDay)} style={{ color: 'rgba(239,68,68,.4)' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14H6L5 6"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Exercise list */}
            {day?.exercises?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest px-1" style={{ color: 'var(--text-3)' }}>
                  {day.exercises.length} exercício{day.exercises.length !== 1 ? 's' : ''}
                </p>
                {day.exercises.map((ex, idx) => (
                  <div key={ex.id}>
                    <div className="f-card p-3 transition-all"
                      style={editingEx?.exId === ex.id ? { borderColor: 'rgba(var(--accent-rgb),.4)' } : {}}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          <span className="font-display font-bold text-sm" style={{ color: AC }}>{idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0" onClick={() => setEditingEx(editingEx?.exId === ex.id ? null : { exId: ex.id, sets: String(ex.sets), reps: ex.reps, notes: ex.notes || '' })}>
                          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>{ex.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                            {ex.sets} séries × {ex.reps} reps
                            {ex.muscle && <span style={{ color: 'rgba(var(--accent-rgb),.5)' }}> · {ex.muscle}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => moveExercise(selectedDay, ex.id, -1)} disabled={idx === 0}
                            className="p-1.5 disabled:opacity-20" style={{ color: 'var(--text-3)' }}>
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
                          </button>
                          <button onClick={() => moveExercise(selectedDay, ex.id, 1)} disabled={idx === day.exercises.length - 1}
                            className="p-1.5 disabled:opacity-20" style={{ color: 'var(--text-3)' }}>
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                          </button>
                          <button onClick={() => removeExercise(selectedDay, ex.id)} className="p-1.5" style={{ color: 'rgba(239,68,68,.4)' }}>
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Inline edit panel */}
                      {editingEx?.exId === ex.id && (
                        <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
                          <div className="grid grid-cols-3 gap-2">
                            {[['sets','Séries','number'],['reps','Reps','text'],['notes','Obs','text']].map(([k,l,t]) => (
                              <div key={k}>
                                <label className="f-label text-xs">{l}</label>
                                <input type={t} className="f-input text-center py-2 text-sm"
                                  placeholder={k === 'notes' ? '—' : k === 'sets' ? '3' : '10'}
                                  value={editingEx[k]}
                                  onChange={e => setEditingEx(p => ({ ...p, [k]: e.target.value }))}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button className="flex-1 py-2 text-sm"
                              onClick={() => updateExercise(selectedDay, ex.id, {
                                sets: parseInt(editingEx.sets) || 3,
                                reps: editingEx.reps || '10',
                                notes: editingEx.notes,
                              })}>
                              Salvar
                            </Button>
                            <Button variant="ghost" className="px-4" onClick={() => setEditingEx(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add exercise button */}
            <button onClick={() => setShowPicker(true)}
              className="w-full f-card p-3 flex items-center justify-center gap-2 transition-all"
              style={{ borderStyle: 'dashed', color: 'var(--text-3)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(var(--accent-rgb),.4)'; e.currentTarget.style.color = AC }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)' }}>
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              <span className="text-sm font-medium">
                Adicionar exercício da biblioteca
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(var(--accent-rgb),.1)', color: AC }}>
                100+
              </span>
            </button>

            {/* Empty state */}
            {!day?.exercises?.length && (
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'rgba(var(--accent-rgb),.06)', border: '1px dashed rgba(var(--accent-rgb),.2)' }}>
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke={AC} strokeWidth="1.5" opacity=".4">
                    <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/>
                  </svg>
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Dia de descanso</p>
                <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
                  Nenhum exercício para {DAYS_FULL[selectedDay]}
                </p>
                <button onClick={() => setShowPicker(true)}
                  className="text-sm font-semibold px-4 py-2 rounded-xl"
                  style={{ background: 'rgba(var(--accent-rgb),.1)', color: AC, border: '1px solid rgba(var(--accent-rgb),.25)' }}>
                  + Criar treino para este dia
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
