import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { trainerService, assessmentService, messageService, programService,
         routineService, workoutLogService, prService, trainerDashboardService } from '@/services'
import { PLANS } from '@/services/payment'
import { Button, Badge } from '@/components/ui'
import PersonalInviteGuide from '@/components/PersonalInviteGuide'
import ProgressPhotosView from '@/views/ProgressPhotosView'
import RoutineView from '@/views/RoutineView'
import EvolutionView from '@/views/EvolutionView'
import { exportRoutinePDF, exportAssessmentPDF, exportProgressPDF } from '@/services/pdfExport'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { captureError } from '@/lib/sentry'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

// Formata a data do último treino de forma legível e relativa — antes,
// essa informação só era visível clicando no perfil do aluno. O personal
// tinha que abrir cada aluno individualmente pra saber "quando foi a
// última vez que ele treinou", em vez de ver isso de cara na lista.
function formatLastWorkout(dateStr) {
  if (!dateStr) return { text: 'Nunca treinou', color: 'var(--text-3)' }
  const date = new Date(dateStr + 'T12:00')
  const today = new Date(); today.setHours(12, 0, 0, 0)
  const diffDays = Math.round((today - date) / 86400000)
  if (diffDays === 0) return { text: 'Treinou hoje', color: '#4ade80' }
  if (diffDays === 1) return { text: 'Treinou ontem', color: '#4ade80' }
  if (diffDays <= 6)  return { text: `Treinou há ${diffDays} dias`, color: 'var(--text-3)' }
  return { text: `Sem treinar há ${diffDays} dias`, color: '#f87171' }
}

function StudentCard({ student, onSelect, inactive, pendingAssessment, lastWorkoutDate }) {
  // Após normalização, name/email estão direto no objeto student
  const name  = student.name  || student.student?.name  || '?'
  const email = student.email || student.student?.email || ''
  const lastWorkout = formatLastWorkout(lastWorkoutDate)

  return (
    <button onClick={() => onSelect(student)}
      className="w-full f-card p-4 text-left flex items-center gap-4 transition-all"
      style={inactive ? { borderColor:'rgba(248,113,113,.25)', background:'rgba(248,113,113,.03)' } : {}}
      onMouseEnter={e => e.currentTarget.style.borderColor='rgba(var(--accent-rgb),.4)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = inactive ? 'rgba(248,113,113,.25)' : 'var(--border)'}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 relative"
        style={{ background:'rgba(var(--accent-rgb),.1)', border:'1px solid rgba(var(--accent-rgb),.2)' }}>
        <span className="font-display text-xl" style={{ color:'var(--accent)' }}>
          {name.charAt(0).toUpperCase()}
        </span>
        {inactive && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background:'#f87171', fontSize:8, color:'#fff', fontWeight:700 }}>!</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate" style={{ color:'var(--text-1)' }}>{name}</p>
        <p className="text-xs font-medium" style={{ color: lastWorkout.color }}>{lastWorkout.text}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          {pendingAssessment && (
            <span className="text-xs font-semibold flex items-center gap-1" style={{ color:'#A855F7' }}>
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
              Avaliação pendente
            </span>
          )}
        </div>
      </div>
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  )
}

function StudentDetail({ student, trainerId, onBack }) {
  // Após normalização o nome/email estão direto em student
  // student is normalized: .name, .email, .id are set directly
  const name  = student.name  || '?'
  const email = student.email || ''
  const sid   = student.id    || student.student_id
  const toast = useToast()
  const [tab, setTab] = useState('chat')

  async function handleExportRoutine() {
    const tid = toast.loading('Gerando PDF da ficha...')
    try {
      const { data: rts } = await routineService.getAll(sid)
      await exportRoutinePDF({ studentName: name, routines: rts || {} })
      toast.dismiss(tid); toast.success('PDF gerado!')
    } catch (e) { captureError(e, { context: 'export_routine_pdf' }); toast.dismiss(tid); toast.error('Erro ao gerar PDF') }
  }

  async function handleExportAssessment() {
    const tid = toast.loading('Gerando PDF...')
    try {
      const { data: asmts } = await assessmentService.getAll(sid)
      await exportAssessmentPDF({ studentName: name, assessments: asmts || [] })
      toast.dismiss(tid); toast.success('PDF gerado!')
    } catch (e) { captureError(e, { context: 'export_assessment_pdf' }); toast.dismiss(tid); toast.error('Erro ao gerar PDF') }
  }

  async function handleExportProgress() {
    const tid = toast.loading('Gerando relatório...')
    try {
      const { data: logs } = await workoutLogService.getAll(sid)
      const { data: prs  } = await prService.getAll(sid)
      await exportProgressPDF({ studentName: name, workoutLogs: logs || [], prs: prs || {} })
      toast.dismiss(tid); toast.success('PDF gerado!')
    } catch (e) { captureError(e, { context: 'export_progress_pdf' }); toast.dismiss(tid); toast.error('Erro ao gerar PDF') }
  }

  return (
    <div className="animate-slide-up">
      {/* Header with back + PDF export */}
      <div className="flex items-center justify-between px-4 pt-4 mb-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm" style={{ color:'var(--text-3)' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          Voltar
        </button>
        <div className="relative group">
          <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl"
            style={{ background:'rgba(var(--accent-rgb),.1)', color:'var(--accent)', border:'1px solid rgba(var(--accent-rgb),.25)' }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            Exportar PDF
          </button>
          <div className="hidden group-hover:flex flex-col absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden"
            style={{ background:'var(--card)', border:'1px solid var(--border)', boxShadow:'0 8px 32px rgba(0,0,0,.4)', minWidth:160 }}>
            {[
              ['📋 Ficha de Treino', handleExportRoutine],
              ['📊 Avaliações',      handleExportAssessment],
              ['📈 Progresso',       handleExportProgress],
            ].map(([label, fn]) => (
              <button key={label} onClick={fn}
                className="px-4 py-2.5 text-xs font-semibold text-left transition-all"
                style={{ color:'var(--text-1)' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(var(--accent-rgb),.08)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Student card */}
      <div className="px-4 mb-4">
        <div className="f-card p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background:'rgba(var(--accent-rgb),.1)', border:'1px solid rgba(var(--accent-rgb),.2)' }}>
            <span className="font-display text-2xl" style={{ color:'var(--accent)' }}>{name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-display text-xl uppercase tracking-wide" style={{ color:'var(--text-1)' }}>{name}</p>
            <p className="text-xs" style={{ color:'var(--text-3)' }}>{email}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
          {[['chat','💬 Chat'],['routine','🏋️ Ficha'],['evolution','📈 Evolução'],['goals','🎯 Metas'],['photos','📸 Fotos'],['assessments','📊 Avaliações'],['programs','📋 Programas']].map(([t,label]) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-shrink-0 flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab===t ? 'var(--card)' : 'transparent',
                color:      tab===t ? 'var(--accent)' : 'var(--text-3)',
                border:     tab===t ? '1px solid var(--border)' : '1px solid transparent',
                minWidth:   60,
              }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={(tab === 'routine' || tab === 'evolution') ? '' : 'px-4'}>
        {tab==='chat'        && <ChatTrainer       studentId={sid} trainerId={trainerId}/>}
        {tab==='routine'     && <RoutineView        embeddedUserId={sid} embeddedName={name}/>}
        {tab==='evolution'   && <EvolutionView      embeddedUserId={sid} embeddedName={name}/>}
        {tab==='goals'       && <GoalsTrainer       studentId={sid}/>}
        {tab==='photos'      && <ProgressPhotosView studentId={sid} readOnly={false}/>}
        {tab==='assessments' && <AssessmentsTrainer studentId={sid} trainerId={trainerId}/>}
        {tab==='programs'    && <ProgramsTrainer    studentId={sid} trainerId={trainerId}/>}
      </div>
    </div>
  )
}

function ChatTrainer({ studentId, trainerId }) {
  const { user } = useAuth()
  const [msgs,  setMsgs]  = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  // Adiciona uma mensagem ao estado local, ignorando se ela já existir
  // (mesmo id). BUG confirmado em teste real: ao enviar, a mensagem era
  // adicionada manualmente em setMsgs() E também chegava de volta via
  // Realtime (a subscription do próprio remetente também escuta o INSERT
  // que ele mesmo fez) — resultado: a mensagem aparecia duplicada, mas só
  // na tela de quem enviou (quem recebe só tem a cópia do Realtime, nunca
  // duplica). No banco havia sempre uma única linha; era puramente um bug
  // de exibição no estado local do React.
  function addMsg(msg) {
    setMsgs(m => m.some(x => x.id === msg.id) ? m : [...m, msg])
  }

  useEffect(() => {
    if (!trainerId) return
    // trainerId = trainers.id (não user.id)
    messageService.getThread(trainerId, studentId).then(({ data }) => {
      setMsgs(data || [])
      setLoading(false)
      // Marcar como lidas
      messageService.markRead(trainerId, studentId, user.id).catch(() => {})
    }).catch(err => {
      console.error('[Voryn] ChatTrainer falhou ao carregar thread:', err)
      setLoading(false)
    })
    // Realtime
    const sub = messageService.subscribe(trainerId, studentId, msg => {
      addMsg(msg)
      messageService.markRead(trainerId, studentId, user.id).catch(() => {})
    })
    return () => sub?.unsubscribe?.()
  }, [trainerId, studentId])

  // Scroll para última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  async function send() {
    const text = input.trim(); if (!text || !trainerId) return
    setInput('')
    const { data, error } = await messageService.send(trainerId, studentId, user.id, text)
    if (data) addMsg(data)
    if (error) console.error('Chat send error:', error)
  }

  return (
    <div className="flex flex-col" style={{ height:'calc(100vh - 320px)' }}>
      <div className="flex-1 overflow-y-auto space-y-3 py-2">
        {msgs.map(m => {
          const isMe = m.sender_id === user.id
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="px-4 py-2.5 rounded-2xl text-sm max-w-xs"
                style={{
                  background: isMe ? 'var(--accent)' : 'var(--card)',
                  color: isMe ? '#fff' : 'var(--text-1)',
                  border: isMe ? 'none' : '1px solid var(--border)',
                }}>
                {m.content}
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-2 pt-2" style={{ borderTop:'1px solid var(--border)' }}>
        <input className="f-input flex-1" placeholder="Mensagem para o aluno..." value={input}
          onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter' && send()}/>
        <button onClick={send} className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background:'var(--accent)' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// Visualização (somente leitura) das metas do aluno — a meta é definida pelo
// próprio aluno em GoalsView; o personal só acompanha aqui. A policy
// goals_trainer_read no banco já existia, mas nenhuma tela usava isso até
// agora — o personal não tinha como ver as metas que o aluno definiu.
function GoalsTrainer({ studentId }) {
  const [goals,   setGoals]   = useState(null)
  const [weeklyGoal, setWeeklyGoal] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) return
    // Sem .catch(), uma falha de rede aqui (ex: app aberto offline) deixa
    // esta tela travada em "carregando" para sempre — mesmo padrão de risco
    // já identificado e corrigido em outros pontos do app nesta sessão.
    Promise.all([
      supabase.from('student_goals').select('*').eq('student_id', studentId).single(),
      supabase.from('users').select('weekly_goal, goal').eq('id', studentId).single(),
    ]).then(([{ data: g }, { data: u }]) => {
      setGoals(g || null)
      setWeeklyGoal(u || null)
      setLoading(false)
    }).catch(err => {
      console.error('[Voryn] GoalsTrainer falhou ao carregar (rede/parse):', err)
      setLoading(false)
    })
  }, [studentId])

  if (loading) return <SkeletonList count={2}/>

  const hasAnyGoal = goals || weeklyGoal?.goal || weeklyGoal?.weekly_goal

  if (!hasAnyGoal) {
    return (
      <div className="f-card p-6 text-center" style={{ color: 'var(--text-3)' }}>
        <div className="text-3xl mb-2">🎯</div>
        <p className="text-sm">Este aluno ainda não definiu metas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {weeklyGoal?.goal && (
        <div className="f-card p-4">
          <p className="f-label mb-1">Objetivo principal</p>
          <p className="font-semibold" style={{ color: 'var(--text-1)' }}>{weeklyGoal.goal}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {weeklyGoal?.weekly_goal && (
          <div className="f-card p-3 text-center">
            <div className="font-display text-xl" style={{ color: 'var(--accent)' }}>{weeklyGoal.weekly_goal}x</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Treinos/semana (meta)</div>
          </div>
        )}
        {goals?.weekly_sessions && (
          <div className="f-card p-3 text-center">
            <div className="font-display text-xl" style={{ color: 'var(--accent)' }}>{goals.weekly_sessions}x</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Sessões planejadas</div>
          </div>
        )}
        {goals?.target_weight && (
          <div className="f-card p-3 text-center">
            <div className="font-display text-xl" style={{ color: 'var(--accent)' }}>{goals.target_weight}kg</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Peso alvo</div>
          </div>
        )}
        {goals?.target_body_fat && (
          <div className="f-card p-3 text-center">
            <div className="font-display text-xl" style={{ color: 'var(--accent)' }}>{goals.target_body_fat}%</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>% Gordura alvo</div>
          </div>
        )}
      </div>
      {goals?.target_date && (
        <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
          Meta para {new Date(goals.target_date + 'T12:00').toLocaleDateString('pt-BR')}
        </p>
      )}
      {goals?.notes && (
        <div className="f-card p-4">
          <p className="text-sm italic" style={{ color: 'var(--text-2)' }}>"{goals.notes}"</p>
        </div>
      )}
    </div>
  )
}

function AssessmentsTrainer({ studentId, trainerId }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ date:new Date().toISOString().slice(0,10), weight:'', body_fat:'', notes:'' })
  const [showAdd, setShowAdd] = useState(false)
  useEffect(() => { assessmentService.getAll(studentId).then(({ data }) => setItems(data)).catch(err => console.error('[Voryn] AssessmentsTrainer falhou:', err)) }, [studentId])
  async function save() {
    const { data } = await assessmentService.create({ student_id:studentId, trainer_id:trainerId, ...form })
    if (data) { setItems(a => [data,...a]); setShowAdd(false) }
  }
  return (
    <div className="space-y-3">
      <button onClick={() => setShowAdd(!showAdd)} className="f-btn f-btn-accent w-full py-2.5 text-sm">+ Nova Avaliação</button>
      {showAdd && (
        <div className="f-card p-4 space-y-3 scale-in">
          <div className="grid grid-cols-3 gap-2">
            <div><label className="f-label">Data</label><input type="date" className="f-input py-2 text-sm" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))}/></div>
            <div><label className="f-label">Peso</label><input type="number" className="f-input py-2 text-center text-sm" value={form.weight} onChange={e => setForm(f=>({...f,weight:e.target.value}))}/></div>
            <div><label className="f-label">% Gord.</label><input type="number" className="f-input py-2 text-center text-sm" value={form.body_fat} onChange={e => setForm(f=>({...f,body_fat:e.target.value}))}/></div>
          </div>
          <textarea className="f-input resize-none text-sm" rows={2} placeholder="Observações..." value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))}/>
          <div className="flex gap-2"><Button className="flex-1 py-2.5 text-sm" onClick={save}>Salvar</Button><Button variant="ghost" className="px-4" onClick={()=>setShowAdd(false)}>Cancelar</Button></div>
        </div>
      )}
      {items.map(a => (
        <div key={a.id} className="f-card p-4">
          <p className="font-semibold text-sm mb-2" style={{ color:'var(--text-1)' }}>{new Date(a.date+'T12:00').toLocaleDateString('pt-BR')}</p>
          <div className="flex gap-3">
            {a.weight && <div className="text-center flex-1"><p className="font-display text-xl" style={{ color:'var(--accent)' }}>{a.weight}kg</p><p className="text-xs" style={{ color:'var(--text-3)' }}>Peso</p></div>}
            {a.body_fat && <div className="text-center flex-1"><p className="font-display text-xl" style={{ color:'var(--accent)' }}>{a.body_fat}%</p><p className="text-xs" style={{ color:'var(--text-3)' }}>Gordura</p></div>}
          </div>
          {a.notes && <p className="text-sm mt-2 italic" style={{ color:'var(--text-3)' }}>"{a.notes}"</p>}
        </div>
      ))}
    </div>
  )
}

function ProgramsTrainer({ studentId, trainerId }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ name:'', start_date:'', end_date:'', description:'' })
  const [showAdd, setShowAdd] = useState(false)
  useEffect(() => { programService.getForStudent(studentId).then(({ data }) => setItems(data)).catch(err => console.error('[Voryn] ProgramsTrainer falhou:', err)) }, [studentId])
  async function save() {
    if (!form.name.trim()) return
    const { data } = await programService.create({ trainer_id:trainerId, student_id:studentId, ...form })
    if (data) { setItems(a => [data,...a]); setShowAdd(false) }
  }
  return (
    <div className="space-y-3">
      <button onClick={() => setShowAdd(!showAdd)} className="f-btn f-btn-accent w-full py-2.5 text-sm">+ Novo Programa</button>
      {showAdd && (
        <div className="f-card p-4 space-y-3 scale-in">
          <input className="f-input" placeholder="Nome do programa" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))}/>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="f-label">Início</label><input type="date" className="f-input py-2 text-sm" value={form.start_date} onChange={e => setForm(f=>({...f,start_date:e.target.value}))}/></div>
            <div><label className="f-label">Término</label><input type="date" className="f-input py-2 text-sm" value={form.end_date} onChange={e => setForm(f=>({...f,end_date:e.target.value}))}/></div>
          </div>
          <textarea className="f-input resize-none text-sm" rows={2} placeholder="Objetivos..." value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))}/>
          <div className="flex gap-2"><Button className="flex-1 py-2.5 text-sm" onClick={save}>Salvar</Button><Button variant="ghost" className="px-4" onClick={()=>setShowAdd(false)}>Cancelar</Button></div>
        </div>
      )}
      {items.map(p => (
        <div key={p.id} className="f-card p-4">
          <p className="font-display text-lg uppercase tracking-wide" style={{ color:'var(--text-1)' }}>{p.name}</p>
          {p.description && <p className="text-sm mt-1" style={{ color:'var(--text-3)' }}>{p.description}</p>}
        </div>
      ))}
    </div>
  )
}

// ── Alerta de alunos inativos ─────────────────────────────────
// Antes, este componente fazia suas PRÓPRIAS queries (uma por aluno, via
// Promise.all) para descobrir quem está inativo — duplicando o trabalho que
// trainerDashboardService.getStats já fazia, e com uma lógica levemente
// diferente (priorizava 'created_at' em vez de 'date'), o que podia fazer
// os dois indicadores de "inativo" do mesmo dashboard discordarem entre si.
// Agora recebe os dados já calculados via prop, de uma fonte única.
function InactiveStudentAlert({ students, inactiveStudentIds, lastWorkoutMap, onSelect }) {
  const inactiveStudents = students
    .filter(s => inactiveStudentIds?.includes(s.id))
    .map(s => ({ ...s, _lastLog: lastWorkoutMap?.[s.id] }))

  if (!inactiveStudents.length) return null

  return (
    <div className="f-card p-4 animate-slide-up"
      style={{ borderColor:'rgba(248,113,113,.3)', background:'rgba(248,113,113,.04)' }}>
      <div className="flex items-center gap-2 mb-3">
        <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p className="text-sm font-semibold" style={{ color:'#f87171' }}>
          {inactiveStudents.length} aluno{inactiveStudents.length !== 1 ? 's' : ''} sem treinar há +7 dias
        </p>
      </div>
      <div className="space-y-2">
        {inactiveStudents.slice(0, 3).map(s => (
          <button key={s.id} onClick={() => onSelect(s)}
            className="w-full flex items-center gap-3 text-left py-2 px-1 rounded-lg transition-all"
            onMouseEnter={e => e.currentTarget.style.background='rgba(248,113,113,.08)'}
            onMouseLeave={e => e.currentTarget.style.background='transparent'}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background:'rgba(248,113,113,.15)', fontSize:12, fontWeight:700, color:'#f87171' }}>
              {(s.name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color:'var(--text-1)' }}>{s.name || 'Aluno'}</p>
              <p className="text-xs" style={{ color:'var(--text-3)' }}>
                {s._lastLog
                  ? `Último treino: ${new Date(s._lastLog + 'T12:00').toLocaleDateString('pt-BR', { day:'numeric', month:'short' })}`
                  : 'Nunca treinou no app'}
              </p>
            </div>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        ))}
      </div>
      {inactiveStudents.length > 3 && (
        <p className="text-xs mt-2" style={{ color:'var(--text-3)' }}>
          +{inactiveStudents.length - 3} outros
        </p>
      )}
    </div>
  )
}

// ── Ações prioritárias do dia ──
// Antes, o dashboard só mostrava NÚMEROS passivos (4 cards, faixa de
// resumo) — o personal tinha que decidir o que fazer com cada um. Esta
// lista monta isso pra ele: ações concretas, já ordenadas por urgência,
// cada uma levando direto pra resolver. Mensagens não lidas vêm primeiro
// (é o que o aluno está esperando agora), depois inativos há mais tempo,
// depois avaliações pendentes. Limitado a 5 itens — o objetivo é uma
// lista curta de "faça isso agora", não outro lugar pra acumular alertas.
function PriorityActions({ students, dashStats, onSelect }) {
  if (!dashStats) return null

  const studentMap = {}
  for (const s of students) studentMap[s.id] = s

  const actions = []

  for (const [studentId, count] of Object.entries(dashStats.unreadByStudent || {})) {
    const s = studentMap[studentId]
    if (!s) continue
    actions.push({
      priority: 0,
      icon: '💬',
      text: `Responder ${s.name || 'aluno'}`,
      detail: `${count} mensagem${count !== 1 ? 's' : ''} não lida${count !== 1 ? 's' : ''}`,
      student: s,
    })
  }

  for (const studentId of (dashStats.inactiveStudentIds || [])) {
    const s = studentMap[studentId]
    if (!s) continue
    const last = dashStats.lastWorkoutMap?.[studentId]
    const days = last ? Math.round((new Date() - new Date(last + 'T12:00')) / 86400000) : null
    actions.push({
      priority: 1,
      icon: '⚠️',
      text: `Falar com ${s.name || 'aluno'}`,
      detail: days ? `sem treinar há ${days} dias` : 'nunca treinou',
      student: s,
      sortKey: days || 9999,
    })
  }

  for (const studentId of (dashStats.pendingAssessmentIds || [])) {
    const s = studentMap[studentId]
    if (!s) continue
    actions.push({
      priority: 2,
      icon: '📊',
      text: `Avaliar ${s.name || 'aluno'}`,
      detail: 'avaliação física pendente',
      student: s,
    })
  }

  actions.sort((a, b) => a.priority - b.priority || (b.sortKey || 0) - (a.sortKey || 0))
  const top = actions.slice(0, 5)
  if (!top.length) return null

  return (
    <div className="f-card p-4" style={{ borderColor: 'rgba(var(--accent-rgb),.25)' }}>
      <p className="text-xs font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
        ✅ Hoje você devia
      </p>
      <div className="space-y-1">
        {top.map((a, i) => (
          <button key={i} onClick={() => onSelect(a.student)}
            className="w-full flex items-center gap-3 text-left py-2 px-1 rounded-lg transition-all"
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--accent-rgb),.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span className="text-base flex-shrink-0">{a.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{a.text}</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>{a.detail}</p>
            </div>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2" className="flex-shrink-0">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Ranking de consistência — top alunos por streak atual ──
function ConsistencyRanking({ students, ranking, onSelect }) {
  if (!ranking?.length) return null
  const top = ranking.filter(r => r.streak > 0).slice(0, 5)
  if (!top.length) return null

  const studentMap = {}
  for (const s of students) studentMap[s.id] = s

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="f-card p-4 animate-slide-up" style={{ borderColor: 'rgba(250,204,21,.25)', background: 'rgba(250,204,21,.03)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🔥</span>
        <p className="text-sm font-semibold" style={{ color: '#facc15' }}>Ranking de consistência</p>
      </div>
      <div className="space-y-2">
        {top.map((r, i) => {
          const s = studentMap[r.studentId]
          if (!s) return null
          return (
            <button key={r.studentId} onClick={() => onSelect(s)}
              className="w-full flex items-center gap-3 text-left py-2 px-1 rounded-lg transition-all"
              onMouseEnter={e => e.currentTarget.style.background='rgba(250,204,21,.06)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <div className="w-7 text-center flex-shrink-0 text-sm">{medals[i] || `${i + 1}º`}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{s.name || 'Aluno'}</p>
              </div>
              <Badge variant="accent">{r.streak} dia{r.streak !== 1 ? 's' : ''} 🔥</Badge>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Painel de PRs recentes (não é filtro de aluno, é lista de eventos) ──
function RecentPRsPanel({ newPRs, students }) {
  if (!newPRs?.length) {
    return (
      <div className="text-center py-10">
        <div className="text-3xl mb-2">🏆</div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
          Nenhum PR batido nos últimos 7 dias
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
          Quando um aluno bater um recorde, ele aparece aqui
        </p>
      </div>
    )
  }

  const nameById = {}
  students.forEach(s => { nameById[s.id] = s.name })

  return (
    <div className="space-y-2">
      {newPRs.map((pr, i) => (
        <div key={`${pr.user_id}-${pr.exercise}-${i}`} className="f-card p-3.5 flex items-center gap-3"
          style={{ borderColor: 'rgba(250,204,21,.2)', background: 'rgba(250,204,21,.03)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
            style={{ background: 'rgba(250,204,21,.12)' }}>
            🏆
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>
              {nameById[pr.user_id] || 'Aluno'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              {pr.exercise} · {pr.weight}kg × {pr.reps} reps
            </p>
          </div>
          <p className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)' }}>
            {new Date(pr.date + 'T12:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
          </p>
        </div>
      ))}
    </div>
  )
}

export default function PersonalDashboardView() {
  const { user, plan } = useAuth()
  const [trainer,        setTrainer]         = useState(null)
  const [students,       setStudents]        = useState([])
  const [selectedStudent,setSelectedStudent] = useState(null)
  const [showAddStudent, setShowAddStudent]  = useState(false)
  const [loading,        setLoading]         = useState(true)
  const [dashStats,      setDashStats]       = useState(null)
  const [filterView,     setFilterView]      = useState('all') // all | inactive | pending_assessment

  // Recalcula os 4 cards do dashboard (inativos/PRs/avaliações) e re-marca os badges
  // nos alunos já carregados. Centralizado aqui para ser chamado tanto no load inicial
  // quanto após qualquer ação que altere a lista de alunos (ex: adicionar manualmente).
  function refreshDashStats(trainerId, normalizedStudents) {
    const studentIds = normalizedStudents.map(s => s.id).filter(Boolean)
    trainerDashboardService.getStats(trainerId, studentIds).then(stats => {
      setDashStats(stats)
      setStudents(prev => prev.map(s => ({
        ...s,
        _inactive: stats.inactiveStudentIds?.includes(s.id),
        _pendingAssessment: stats.pendingAssessmentIds?.includes(s.id),
      })))
    })
  }

  useEffect(() => {
    if (!user) return
    // Esta é a tela de ENTRADA do dashboard do personal — a primeira coisa
    // que ele vê ao logar. Antes, esta cadeia de 3 chamadas (getProfile ->
    // getStudents -> upsert) não tinha NENHUM .catch() — se qualquer uma
    // rejeitasse (rede/parse), setLoading(false) nunca era chamado em
    // nenhum dos 3 caminhos possíveis, travando a tela em "carregando"
    // para sempre. Esse era o ponto de maior impacto de toda a varredura
    // de Promises sem tratamento de erro, por ser a primeira tela vista
    // por quem paga mais.
    trainerService.getProfile(user.id).then(({ data }) => {
      if (data) {
        setTrainer(data)
        trainerService.getStudents(data.id).then(({ data: s }) => {
          // Normalizar: Supabase pode retornar o join como .users ou .student
          const normalized = (s || []).map(row => ({
            ...row,
            // suporte a ambas as formas do join
            id:    row.users?.id    ?? row.student_id,
            name:  row.users?.name  ?? row.name  ?? '—',
            email: row.users?.email ?? row.email ?? '—',
          }))
          setStudents(normalized)
          setLoading(false)
          refreshDashStats(data.id, normalized)
        }).catch(err => {
          console.error('[Voryn] Dashboard: falha ao carregar alunos:', err)
          setLoading(false)
        })
      } else {
        // Auto-create trainer profile
        trainerService.upsert(user.id, {}).then(({ data: t }) => { setTrainer(t); setLoading(false) })
          .catch(err => {
            console.error('[Voryn] Dashboard: falha ao criar perfil de trainer:', err)
            setLoading(false)
          })
      }
    }).catch(err => {
      console.error('[Voryn] Dashboard: falha ao carregar perfil de trainer:', err)
      setLoading(false)
    })
  }, [user])

  const toast = useToast()

  // Antes, isto era handleAddStudent — chamado pelo modal seco e isolado
  // de "Adicionar Aluno" (só um campo de email). Esse modal foi unificado
  // dentro do PersonalInviteGuide (que já tinha QR code, compartilhar,
  // etc) — agora esta função só recarrega a lista após o
  // PersonalInviteGuide confirmar que o vínculo deu certo.
  async function reloadStudentsAfterAdd() {
    if (!trainer) return
    const { data } = await trainerService.getStudents(trainer.id)
    const normalized = (data || []).map(row => ({
      ...row,
      id:    row.users?.id    ?? row.student_id,
      name:  row.users?.name  ?? row.name  ?? '—',
      email: row.users?.email ?? row.email ?? '—',
    }))
    setStudents(normalized)
    setShowAddStudent(false)
    refreshDashStats(trainer.id, normalized)
  }

  if (loading) return (
    <div className="px-4 pt-6 pb-8">
      <div className="skeleton-pulse h-8 w-40 rounded-lg mb-2" style={{ background: 'var(--border)' }}/>
      <div className="skeleton-pulse h-4 w-24 rounded mb-6" style={{ background: 'var(--border)' }}/>
      <SkeletonList count={4}/>
    </div>
  )

  if (selectedStudent) return <StudentDetail student={selectedStudent} trainerId={trainer?.id} onBack={() => setSelectedStudent(null)}/>

  const studentLimit = PLANS[plan]?.maxStudents || trainer?.max_students || 15
  const atLimit = students.length >= studentLimit

  return (
    <div className="px-4 pt-6 pb-4 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide" style={{ color:'var(--text-1)' }}>Meus Alunos</h1>
          <p className="text-sm mt-0.5" style={{ color: atLimit ? '#f87171' : 'var(--text-3)' }}>
            {students.length} / {studentLimit} alunos
          </p>
        </div>
        <button onClick={() => atLimit ? null : setShowAddStudent(true)}
          disabled={atLimit}
          title={atLimit ? 'Limite de alunos do plano atingido — faça upgrade para adicionar mais' : undefined}
          className="f-btn f-btn-accent px-4 py-2.5 text-sm"
          style={atLimit ? { opacity: .5, cursor: 'not-allowed' } : {}}>
          + Aluno
        </button>
      </div>

      {atLimit && (
        <div className="f-card p-3.5 text-sm" style={{ borderColor: 'rgba(248,113,113,.3)', background: 'rgba(248,113,113,.05)', color: '#f87171' }}>
          Você atingiu o limite de {studentLimit} alunos do seu plano.{' '}
          <a href="/app/subscription" style={{ textDecoration: 'underline', fontWeight: 600 }}>Fazer upgrade</a>
        </div>
      )}

      {/* Dashboard agressivo de gestão — 4 cards com navegação direta */}
      <div className="grid grid-cols-2 gap-2">
        {[
          {
            key: 'all', label: 'Alunos',
            value: students.length,
            icon: (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            ),
            color: 'var(--accent)', bg: 'rgba(var(--accent-rgb),.08)', border: 'rgba(var(--accent-rgb),.2)',
          },
          {
            key: 'inactive', label: 'Sem treinar há 7+ dias',
            value: dashStats?.inactiveCount ?? '—',
            icon: (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            ),
            color: '#f87171', bg: 'rgba(248,113,113,.08)', border: 'rgba(248,113,113,.25)',
            urgent: (dashStats?.inactiveCount ?? 0) > 0,
          },
          {
            key: 'prs', label: 'Novos PRs (7 dias)',
            value: dashStats?.newPRsCount ?? '—',
            icon: (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
              </svg>
            ),
            color: '#facc15', bg: 'rgba(250,204,21,.08)', border: 'rgba(250,204,21,.2)',
          },
          {
            key: 'pending_assessment', label: 'Avaliações pendentes',
            value: dashStats?.pendingAssessments ?? '—',
            icon: (
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
              </svg>
            ),
            color: '#A855F7', bg: 'rgba(168,85,247,.08)', border: 'rgba(168,85,247,.2)',
            urgent: (dashStats?.pendingAssessments ?? 0) > 0,
          },
        ].map(s => (
          <button key={s.key} onClick={() => setFilterView(s.key === 'all' ? 'all' : s.key)}
            className="f-card p-3.5 text-left transition-all relative"
            style={{
              borderColor: filterView === s.key ? s.color : 'var(--border)',
              background:  filterView === s.key ? s.bg : 'var(--card)',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = s.border}
            onMouseLeave={e => e.currentTarget.style.borderColor = filterView === s.key ? s.color : 'var(--border)'}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: s.bg, color: s.color }}>
                {s.icon}
              </div>
              {s.urgent && (
                <span className="w-2 h-2 rounded-full" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}/>
              )}
            </div>
            <div className="font-display text-2xl leading-none" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-1 leading-tight" style={{ color: 'var(--text-3)' }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Faixa de resumo agregado — treinos da semana e adesão entre todos os
          alunos. São métricas informativas (não filtram a lista), por isso
          ficam num estilo mais discreto, separadas dos 4 cards de ação acima. */}
      {filterView === 'all' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="f-card p-3.5">
            <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Treinos esta semana</p>
            <p className="font-display text-xl" style={{ color: 'var(--text-1)' }}>
              {dashStats?.weekWorkoutsCount ?? '—'}
              <span className="text-xs font-normal ml-1" style={{ color: 'var(--text-3)' }}>no total</span>
            </p>
          </div>
          <div className="f-card p-3.5">
            <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Adesão aos treinos</p>
            <p className="font-display text-xl" style={{ color: dashStats?.adherenceRate != null && dashStats.adherenceRate < 50 ? '#f87171' : 'var(--text-1)' }}>
              {dashStats?.adherenceRate != null ? `${dashStats.adherenceRate}%` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Crescimento da carteira — antes o dashboard só mostrava o estado
          atual congelado (quantos alunos tem agora, quem está inativo),
          sem nada que desse ao personal a sensação de que o próprio
          negócio está crescendo. Esse gráfico é deliberadamente simples:
          não é "o que está errado", é "como tá indo o meu negócio". */}
      {filterView === 'all' && dashStats?.growthChart?.some(m => m.novos > 0) && (
        <div className="f-card p-4">
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-3)' }}>
            Novos alunos · últimos 6 meses
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={dashStats.growthChart}>
              <XAxis dataKey="month" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis hide allowDecimals={false}/>
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--text-1)' }}
                formatter={(v) => [`${v} aluno${v !== 1 ? 's' : ''}`, 'Novos']}/>
              <Bar dataKey="novos" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={28}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filtro ativo — mostra qual segmento está selecionado */}
      {filterView !== 'all' && (
        <div className="flex items-center justify-between f-card px-4 py-2.5"
          style={{ borderColor: 'rgba(var(--accent-rgb),.25)', background: 'rgba(var(--accent-rgb),.04)' }}>
          <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
            {filterView === 'inactive'           && `Mostrando ${dashStats?.inactiveCount ?? 0} aluno(s) inativo(s)`}
            {filterView === 'pending_assessment'  && `Mostrando ${dashStats?.pendingAssessments ?? 0} aluno(s) com avaliação pendente`}
            {filterView === 'prs'                 && `${dashStats?.newPRsCount ?? 0} PR(s) batidos nos últimos 7 dias`}
          </p>
          <button onClick={() => setFilterView('all')} className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
            Limpar filtro ✕
          </button>
        </div>
      )}

      {/* Ações prioritárias do dia — lista curta e concreta de "faça isso
          agora", combinando mensagens não lidas, alunos inativos e
          avaliações pendentes em ordem de urgência. Fica no topo de
          propósito: é a primeira coisa que o personal deveria ver. */}
      {filterView === 'all' && (
        <PriorityActions students={students} dashStats={dashStats} onSelect={setSelectedStudent}/>
      )}

      {/* Smart alerts — alunos sem treinar há 7 dias (compacto, sempre visível) */}
      {filterView === 'all' && (
        <InactiveStudentAlert
          students={students}
          inactiveStudentIds={dashStats?.inactiveStudentIds}
          lastWorkoutMap={dashStats?.lastWorkoutMap}
          onSelect={setSelectedStudent}
        />
      )}

      {/* Ranking de consistência — quem está treinando com mais regularidade */}
      {filterView === 'all' && (
        <ConsistencyRanking
          students={students}
          ranking={dashStats?.consistencyRanking}
          onSelect={setSelectedStudent}
        />
      )}

      {/* Adicionar Aluno — antes era um modal isolado, só com campo de
          email, completamente desconectado da experiência de convite (QR
          code, compartilhar) que já existia em outro lugar do app. Agora
          é a mesma experiência unificada nos dois casos. */}
      {showAddStudent && (
        <div className="scale-in">
          <PersonalInviteGuide
            trainerId={trainer?.id}
            onClose={() => setShowAddStudent(false)}
            onStudentAdded={reloadStudentsAfterAdd}
          />
        </div>
      )}

      {/* Students List / PRs Panel */}
      {filterView === 'prs'
        ? <RecentPRsPanel newPRs={dashStats?.newPRs} students={students}/>
        : students.length === 0
        ? (
            <div className="space-y-4">
              <PersonalInviteGuide trainerId={trainer?.id} onStudentAdded={reloadStudentsAfterAdd}/>
            </div>
          )
        : (() => {
            const filtered = filterView === 'inactive'
              ? students.filter(s => s._inactive)
              : filterView === 'pending_assessment'
              ? students.filter(s => s._pendingAssessment)
              : students

            if (filterView !== 'all' && filtered.length === 0) {
              return (
                <div className="text-center py-10">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                    {filterView === 'inactive' ? 'Todos os alunos estão treinando!' : 'Todas as avaliações estão em dia!'}
                  </p>
                </div>
              )
            }

            // Antes, a lista vinha em ordem de cadastro — todo aluno tinha o
            // mesmo peso visual, sem nenhuma forma de saber de cara quem
            // precisa de atenção agora. Agora ordena por urgência: inativo
            // primeiro, depois avaliação pendente, depois por quanto tempo
            // faz que treinou (mais tempo parado primeiro), e por último
            // ordem alfabética como critério estável.
            const sorted = [...filtered].sort((a, b) => {
              if (a._inactive !== b._inactive) return a._inactive ? -1 : 1
              if (a._pendingAssessment !== b._pendingAssessment) return a._pendingAssessment ? -1 : 1
              const lastA = dashStats?.lastWorkoutMap?.[a.id]
              const lastB = dashStats?.lastWorkoutMap?.[b.id]
              if (!lastA && !lastB) return (a.name || '').localeCompare(b.name || '')
              if (!lastA) return -1
              if (!lastB) return 1
              if (lastA !== lastB) return lastA < lastB ? -1 : 1
              return (a.name || '').localeCompare(b.name || '')
            })

            return (
              <div className="space-y-2">
                {sorted.map(s => (
                  <StudentCard key={s.id} student={s} onSelect={setSelectedStudent}
                    inactive={s._inactive} pendingAssessment={s._pendingAssessment}
                    lastWorkoutDate={dashStats?.lastWorkoutMap?.[s.id]}/>
                ))}
              </div>
            )
          })()
      }
    </div>
  )
}
