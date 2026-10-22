import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { routineService } from '@/services'
import { readStoredJson } from '@/utils/helpers'
import { Button } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { SkeletonList } from '@/components/ui/Skeleton'
import ExercisePicker from '@/components/ExercisePicker'

const DAYS_FULL  = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
const DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const AC  = 'var(--accent)'
const ACT = 'var(--accent-text)'

function genId() { return Math.random().toString(36).slice(2,9) }

// RoutineView é usado tanto pelo próprio aluno (rota /app/routine, sem props)
// quanto pelo personal editando a ficha de um aluno (embeddedUserId).
// Quando embeddedUserId é passado, todas as operações de leitura/escrita
// usam esse id em vez do usuário logado — e o cabeçalho/empty states mudam
// de "Minha Rotina" para deixar claro que é a ficha de outra pessoa.
export default function RoutineView({ embeddedUserId, embeddedName, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const targetUserId = embeddedUserId || user?.id
  const isEmbedded = Boolean(embeddedUserId)
  const toast = useToast()
  const [routines,      setRoutines]      = useState({})
  const [selectedDay,   setSelectedDay]   = useState(new Date().getDay())
  const [showPicker,    setShowPicker]    = useState(false)
  const [replacingEx,   setReplacingEx]   = useState(null)
  const [editName,      setEditName]      = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [loading,       setLoading]       = useState(true)
  const [editingEx,     setEditingEx]     = useState(null) // {exId, sets, reps, notes}
  const [trainerName,   setTrainerName]   = useState(null)
  const [templates,     setTemplates]     = useState([])
  const [showTemplates, setShowTemplates] = useState(false)

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

  useEffect(() => {
    if (!targetUserId || isEmbedded) return
    try {
      setTemplates(readStoredJson(`voryn_routine_templates_${targetUserId}`, []))
    } catch (err) {
      console.error('[Voryn] Não foi possível carregar templates:', err)
    }
  }, [targetUserId, isEmbedded])

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
    if (replacingEx) {
      const exercises = (current.exercises || []).map(item => item.id === replacingEx
        ? { ...item, name: ex.name, muscle: ex.muscle, secondaryMuscles: ex.secondaryMuscles || [], equipment: ex.equipment }
        : item)
      const updated = { ...current, exercises }
      setRoutines(r => ({ ...r, [selectedDay]: updated }))
      persist(selectedDay, updated, `${ex.name} substituído!`)
      setReplacingEx(null)
      setShowPicker(false)
      return
    }
    const exercises = [...(current.exercises || []), {
      id: genId(), name: ex.name, sets: 3, reps: '10',
      muscle: ex.muscle, secondaryMuscles: ex.secondaryMuscles || [],
      equipment: ex.equipment, notes: '', supersetGroup: ''
    }]
    const updated = { ...current, exercises }
    setRoutines(r => ({ ...r, [selectedDay]: updated }))
    persist(selectedDay, updated, `${ex.name} adicionado!`)
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

  function saveTemplate() {
    if (!day?.exercises?.length || isEmbedded) return
    const name = window.prompt('Nome do template', day.name || `${DAYS_FULL[selectedDay]} - modelo`)
    if (!name?.trim()) return
    const next = [...templates, {
      id: genId(),
      name: name.trim(),
      exercises: day.exercises.map(({ id, ...exercise }) => ({ ...exercise, id: genId() })),
    }]
    setTemplates(next)
    localStorage.setItem(`voryn_routine_templates_${targetUserId}`, JSON.stringify(next))
    toast.success('Template salvo!')
  }

  function applyTemplate(template) {
    const updated = { name: template.name, exercises: template.exercises.map(({ id, ...exercise }) => ({ ...exercise, id: genId() })) }
    setRoutines(r => ({ ...r, [selectedDay]: updated }))
    persist(selectedDay, updated, 'Template aplicado!')
    setShowTemplates(false)
  }

  function duplicateDay(targetDay) {
    if (!day?.exercises?.length || Number(targetDay) === selectedDay) return
    const updated = {
      ...day,
      exercises: day.exercises.map(({ id, ...exercise }) => ({ ...exercise, id: genId() })),
    }
    setRoutines(r => ({ ...r, [targetDay]: updated }))
    persist(Number(targetDay), updated, `Rotina duplicada para ${DAYS_FULL[targetDay]}!`)
  }

  const day = routines[selectedDay]
  const exerciseCount = day?.exercises?.length || 0
  const totalSets = (day?.exercises || []).reduce((total, exercise) => total + (Number(exercise.sets) || 0), 0)

  if (showPicker) {
    return (
      <ExercisePicker
        onSelect={addExerciseFromLibrary}
        onClose={() => { setShowPicker(false); setReplacingEx(null) }}
        initialMuscle={replacingEx ? routines[selectedDay]?.exercises?.find(ex => ex.id === replacingEx)?.muscle || '' : ''}
        onCustom={name => addExerciseFromLibrary({ id: `custom_${Date.now()}`, name, muscle: 'Outro', equipment: 'Livre', type: 'compound' })}
      />
    )
  }

  return (
    <div className="app-view routine-view pb-8">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
            {isEmbedded ? 'Ficha de Treino' : 'Minha Rotina'}
          </h1>
          <p className="text-sm mt-1 flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
            {isEmbedded ? `Editando a ficha de ${embeddedName || 'aluno'}` : 'Organize sua semana'}
            {saving && (
              <span className="flex items-center gap-1" style={{ color: ACT }}>
                <svg className="animate-spin" width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Salvando...
              </span>
            )}
          </p>
        </div>
        {isEmbedded && onClose && (
          <button onClick={onClose} aria-label="Fechar rotina" className="icon-btn rounded-xl" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>


      {/* Day selector */}
      <div className="px-4 mb-4">
        {!isEmbedded && day?.created_by && trainerName && (
          <div className="flex items-center gap-1.5 mb-3 text-xs" style={{ color: 'var(--text-3)' }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="var(--accent-text)" strokeWidth="2" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
              <path d="M20 8v6M23 11h-6"/>
            </svg>
            Ficha montada por <span style={{ color: 'var(--accent-text)', fontWeight: 600 }}>{trainerName}</span>
          </div>
        )}
        <div className="schedule-rail flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Selecionar dia da semana" style={{ scrollbarWidth: 'none' }}>
          {DAYS_SHORT.map((d, i) => {
            const hasPlan = routines[i]?.name || routines[i]?.exercises?.length
            const isSel   = i === selectedDay
            const isToday = i === new Date().getDay()
            return (
              <button key={i}
                onClick={() => { setSelectedDay(i); setEditName(false) }}
                aria-pressed={isSel}
                aria-label={`${d}${isToday ? ', hoje' : ''}${hasPlan ? ', com plano' : ', sem plano'}`}
                className="routine-day-button flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 relative"
                style={{
                  background: isSel ? 'var(--raised)' : 'var(--card)',
                  border:     `1px solid ${isSel ? 'var(--line-strong)' : 'var(--border)'}`,
                  color:      isSel ? 'var(--text-1)' : 'var(--text-3)',
                }}>
                {hasPlan && !isSel && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: AC }} aria-hidden="true"/>
                )}
                <span className="text-xs font-semibold">{d}</span>
                <span className="text-xs">{isToday ? 'Hoje' : `${i+1}°`}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="routine-content px-4 space-y-3">
        {loading ? (
          <SkeletonList count={3}/>
        ) : (
          <>
            {/* Name card */}
            <div className="f-card p-4">
              <div className="flex items-center gap-3">
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
                      <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-3)' }}>
                        {DAYS_FULL[selectedDay]}
                      </p>
                      <p className="text-sm font-semibold" style={{ color: day?.name ? 'var(--text-1)' : 'var(--text-3)' }}>
                        {day?.name || 'Toque para nomear o treino...'}
                      </p>
                    </button>
                  )}
                </div>
                {(day?.name || day?.exercises?.length > 0) && (
                  <button onClick={() => clearDay(selectedDay)} style={{ color: 'rgba(var(--danger-rgb), .4)' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14H6L5 6"/>
                    </svg>
                  </button>
                )}
              </div>
              {!isEmbedded && day?.exercises?.length > 0 && (
                <div className="mt-3 pt-3 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <button type="button" onClick={saveTemplate}
                    className="px-3 py-2 rounded-lg text-xs font-semibold"
                    style={{ color: ACT, border: '1px solid rgba(var(--accent-rgb),.3)' }}>
                    Salvar como template
                  </button>
                  <button type="button" onClick={() => setShowTemplates(v => !v)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold"
                    style={{ color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                    {showTemplates ? 'Fechar templates' : 'Usar template'}
                  </button>
                  <label className="flex items-center gap-2 ml-auto text-xs" style={{ color: 'var(--text-3)' }}>
                    Duplicar para
                    <select className="f-input py-2 px-2 text-xs" value="" onChange={e => duplicateDay(e.target.value)}>
                      <option value="">dia...</option>
                      {DAYS_SHORT.map((label, index) => index !== selectedDay && <option key={index} value={index}>{label}</option>)}
                    </select>
                  </label>
                </div>
              )}
              {showTemplates && (
                <div className="mt-3 space-y-2">
                  {templates.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>Salve um dia como template para reutilizá-lo.</p>
                  ) : templates.map(template => (
                    <button key={template.id} type="button" onClick={() => applyTemplate(template)}
                      className="w-full p-3 rounded-xl text-left flex items-center justify-between"
                      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{template.name}</span>
                      <span className="text-xs" style={{ color: ACT }}>{template.exercises.length} exercícios</span>
                    </button>
                  ))}
                </div>
              )}
              {exerciseCount > 0 && (
                <div className="routine-overview mt-4 pt-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                      {exerciseCount} exercício{exerciseCount === 1 ? '' : 's'} · {totalSets} séries
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                      Resumo da sessão
                    </p>
                  </div>
                  {!isEmbedded && (
                    <button
                      type="button"
                      onClick={() => navigate('/app/workout')}
                      className="routine-start-button"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Iniciar treino
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Exercise list */}
            {day?.exercises?.length > 0 && (
              <div className="exercise-list space-y-2">
                <p className="text-sm font-semibold px-1" style={{ color: 'var(--text-2)' }}>
                  {day.exercises.length} exercício{day.exercises.length !== 1 ? 's' : ''}
                </p>
                {day.exercises.map((ex, idx) => (
                  <div key={ex.id}>
                    <div className="f-card p-3 transition-all"
                      style={editingEx?.exId === ex.id ? { borderColor: 'rgba(var(--accent-rgb),.4)' } : {}}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                          <span className="font-display font-bold text-sm" style={{ color: ACT }}>{idx + 1}</span>
                        </div>
                        {/* Sem o diagrama de músculo aqui: na ficha de
                            planejamento o grupo muscular já está escrito no
                            chip "Alvo", e um gráfico de 48px repetido em
                            cada linha é ruído. O diagrama fica na tela de
                            Treino, onde ele ajuda a mirar o exercício. */}
                        <div className="flex-1 min-w-0" onClick={() => setEditingEx(editingEx?.exId === ex.id ? null : { exId: ex.id, sets: String(ex.sets), reps: ex.reps, notes: ex.notes || '', supersetGroup: ex.supersetGroup || '' })}>
                          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>{ex.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                            {ex.sets} séries × {ex.reps} reps
                            {ex.muscle && <span style={{ color: 'rgba(var(--accent-rgb),.5)' }}> · {ex.muscle}</span>}
                            {ex.supersetGroup && <span style={{ color: ACT }}> · SS {ex.supersetGroup}</span>}
                          </p>
                          <span className="muscle-target-chip">Alvo: {ex.muscle || 'não informado'}</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => moveExercise(selectedDay, ex.id, -1)} disabled={idx === 0}
                            aria-label={`Mover ${ex.name} para cima`}
                            className="p-1.5 disabled:opacity-20" style={{ color: 'var(--text-3)' }}>
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M18 15l-6-6-6 6"/></svg>
                          </button>
                          <button onClick={() => moveExercise(selectedDay, ex.id, 1)} disabled={idx === day.exercises.length - 1}
                            aria-label={`Mover ${ex.name} para baixo`}
                            className="p-1.5 disabled:opacity-20" style={{ color: 'var(--text-3)' }}>
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
                          </button>
                          <button onClick={() => removeExercise(selectedDay, ex.id)} className="p-1.5"
                            aria-label={`Remover ${ex.name}`}
                            style={{ color: 'rgba(var(--danger-rgb), .4)' }}>
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => { setReplacingEx(ex.id); setShowPicker(true) }}
                            className="p-1.5"
                            style={{ color: ACT }}
                            aria-label={`Substituir ${ex.name}`}
                            title="Sugerir substituição"
                          >
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                              <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Inline edit panel */}
                      {editingEx && editingEx.exId === ex.id && (
                        <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--border)' }}>
                          <div className="grid grid-cols-2 gap-2">
                            {[['sets','Séries','number'],['reps','Reps','text'],['notes','Obs','text'],['supersetGroup','Supersérie','text']].map(([k,l,t]) => (
                              <div key={k}>
                                <label className="f-label text-xs">{l}</label>
                                <input type={t} className="f-input text-center py-2 text-sm"
                                  placeholder={k === 'notes' ? '—' : k === 'sets' ? '3' : '10'}
                                  value={editingEx[k]}
                                  onChange={e => setEditingEx(p => (p ? { ...p, [k]: e.target.value } : p))}
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
                                supersetGroup: editingEx.supersetGroup.trim().slice(0, 12),
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
              className="w-full f-card p-3 flex items-center justify-center gap-2"
              style={{ borderStyle: 'dashed', color: 'var(--text-2)' }}>
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="16"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              <span className="text-sm font-medium">
                Adicionar exercício da biblioteca
              </span>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                100+
              </span>
            </button>

            {/* Empty state */}
            {!day?.exercises?.length && (
              <div className="text-center py-10">
                <p className="f-empty-mark mb-1" aria-hidden="true">
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/>
                  </svg>
                </p>
                <p className="text-lg font-semibold mb-1" style={{ color: 'var(--text-1)' }}>Dia de descanso</p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
                  Nenhum exercício para {DAYS_FULL[selectedDay]}
                </p>
                <button onClick={() => setShowPicker(true)}
                  className="f-btn f-btn-accent">
                  Criar treino para este dia
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
