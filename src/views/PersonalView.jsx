import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { trainerService, assessmentService, messageService, programService } from '@/services'
import { Button, Badge, Card, Modal, EmptyState } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { localDateKey } from '@/utils/helpers'

const SUBTABS = [
  { id:'overview',    label:'Perfil' },
  { id:'chat',        label:'Chat' },
  { id:'assessments', label:'Avaliações' },
  { id:'programs',    label:'Programas' },
]

function TrainerOverview({ data, onRemove }) {
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="f-card p-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background:'rgba(var(--accent-rgb),.15)', border:'1.5px solid rgba(var(--accent-rgb),.3)' }}>
            <span className="font-display text-2xl" style={{ color:'var(--accent)' }}>
              {data.user?.name?.charAt(0)?.toUpperCase() || 'P'}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-display text-xl uppercase tracking-wide" style={{ color:'var(--text-1)' }}>{data.user?.name}</p>
            {data.bio && <p className="text-xs mt-1 leading-relaxed" style={{ color:'var(--text-3)' }}>{data.bio}</p>}
          </div>
        </div>
        {data.specialties?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {data.specialties.map(s => <Badge key={s} variant="accent">{s}</Badge>)}
          </div>
        )}
      </div>

      {/* Contacts */}
      <div className="f-card p-4 space-y-3">
        <p className="f-label">Contato</p>
        {[
          { icon:'📱', label:'WhatsApp', val:data.phone,     href: data.phone ? `https://wa.me/${data.phone.replace(/\D/g,'')}` : null },
          { icon:'📷', label:'Instagram',val:data.instagram, href: data.instagram ? `https://instagram.com/${data.instagram.replace('@','')}` : null },
          { icon:'✉️', label:'Email',    val:data.user?.email,href: data.user?.email ? `mailto:${data.user.email}` : null },
        ].filter(c => c.val).map(c => (
          <a key={c.label} href={c.href} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl transition-all"
            style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
            <span className="text-xl">{c.icon}</span>
            <div>
              <p className="text-xs" style={{ color:'var(--text-3)' }}>{c.label}</p>
              <p className="text-sm font-semibold" style={{ color:'var(--accent)' }}>{c.val}</p>
            </div>
            <svg className="ml-auto" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
          </a>
        ))}
      </div>

      {/* Antes havia também um botão "✏️ Editar" aqui, que abria um
          formulário (bio, telefone, Instagram, especialidades) e, ao salvar,
          só atualizava o estado React local — nunca gravava nada no banco
          (a tabela trainers tem essas colunas, mas nenhuma tela em todo o
          projeto as escreve de fato). Além do bug, fazia pouco sentido de
          produto: não é o aluno quem deveria editar o perfil do próprio
          personal. Removido — essa edição deve existir do lado do personal,
          quando for implementada. */}
      <Button variant="danger" className="w-full" onClick={onRemove}>
        Desvincular do personal
      </Button>
    </div>
  )
}

// ANTES, este componente tinha o chat do lado do aluno completamente
// quebrado: getThread/subscribe recebiam trainerId e studentId trocados de
// posição, e send() era chamado com só 2 argumentos contra uma assinatura
// que espera 4 (trainerId, studentId, senderId, content) — o insert sempre
// falhava (sender_id chegava undefined, e a coluna é NOT NULL no banco).
// Além disso, o "trainerId" vindo do componente pai era na verdade
// trainerData.user_id (id de `users`), não trainers.id — incompatível com
// a foreign key messages.trainer_id, que referencia a tabela `trainers`.
function Chat({ trainerId, studentId, userId }) {
  const [msgs,  setMsgs]  = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  // Mesmo bug confirmado em teste real do lado do personal
  // (PersonalDashboardView): enviar uma mensagem adicionava ela ao estado
  // local manualmente E a subscription Realtime (que o próprio remetente
  // também está escutando) entregava a mesma mensagem de volta — ela
  // aparecia duplicada, mas só na tela de quem enviou. No banco havia
  // sempre uma única linha.
  function addMsg(msg) {
    setMsgs(m => m.some(x => x.id === msg.id) ? m : [...m, msg])
  }

  useEffect(() => {
    if (!trainerId) return
    messageService.getThread(trainerId, studentId)
      .then(({ data }) => { setMsgs(data || []); setLoading(false) })
      .catch(err => { console.error('[Voryn] Chat (aluno) falhou ao carregar:', err); setLoading(false) })
    const ch = messageService.subscribe(trainerId, studentId, msg => addMsg(msg))
    return () => ch.unsubscribe()
  }, [trainerId, studentId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs.length])

  async function send() {
    const text = input.trim(); if (!text || !trainerId) return
    setInput('')
    const { data, error } = await messageService.send(trainerId, studentId, userId, text)
    if (data) addMsg(data)
    if (error) console.error('Chat send error:', error)
  }

  if (loading) return <div className="text-center py-12" style={{ color:'var(--text-3)' }}>Carregando chat...</div>

  return (
    <div className="flex flex-col" style={{ height:'calc(100vh - 240px)' }}>
      <div className="flex-1 overflow-y-auto px-1 py-2 space-y-3">
        {msgs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm" style={{ color:'var(--text-3)' }}>Nenhuma mensagem ainda. Diga olá!</p>
          </div>
        )}
        {msgs.map(m => {
          const isMe = m.sender_id === userId
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div>
                <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                  style={{
                    background: isMe ? 'var(--accent)' : 'var(--card)',
                    color: isMe ? '#fff' : 'var(--text-1)',
                    border: isMe ? 'none' : '1px solid var(--border)',
                    borderBottomRightRadius: isMe ? 4 : 16,
                    borderBottomLeftRadius: !isMe ? 4 : 16,
                  }}>
                  {m.content}
                </div>
                <p className="text-xs mt-1 px-1" style={{ color:'var(--text-3)', textAlign: isMe ? 'right' : 'left' }}>
                  {new Date(m.created_at).toLocaleTimeString('pt-BR',{ hour:'2-digit', minute:'2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef}/>
      </div>
      <div className="flex gap-2 pt-2" style={{ borderTop:'1px solid var(--border)' }}>
        <input className="f-input flex-1" style={{ padding:'10px 14px' }}
          placeholder="Mensagem..." value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==='Enter' && send()}/>
        <button onClick={send} className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
          style={{ background: input.trim() ? 'var(--accent)' : 'var(--surface)', border:'1px solid var(--border)' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke={input.trim() ? '#fff' : 'var(--muted)'} strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

function Assessments({ studentId, trainerId }) {
  const [items,   setItems]   = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [form,    setForm]    = useState({ date: localDateKey(), weight:'', body_fat:'', notes:'' })

  useEffect(() => { assessmentService.getAll(studentId).then(({ data }) => setItems(data)).catch(err => console.error('[Voryn] Assessments (aluno) falhou:', err)) }, [studentId])

  async function save() {
    if (!form.weight && !form.notes) return
    const { data } = await assessmentService.create({ student_id:studentId, trainer_id:trainerId, ...form })
    if (data) { setItems(a => [data, ...a]); setShowAdd(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:'var(--text-3)' }}>
          {items.length} avaliações
        </p>
        <button onClick={() => setShowAdd(!showAdd)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg"
          style={{ background:'rgba(var(--accent-rgb),.1)', color:'var(--accent)', border:'1px solid rgba(var(--accent-rgb),.2)' }}>
          + Nova
        </button>
      </div>
      {showAdd && (
        <div className="f-card p-4 space-y-3 scale-in" style={{ borderColor:'rgba(var(--accent-rgb),.3)' }}>
          <div className="grid grid-cols-3 gap-2">
            <div><label className="f-label">Data</label><input type="date" className="f-input py-2 text-sm" value={form.date} onChange={e => setForm(f => ({ ...f, date:e.target.value }))}/></div>
            <div><label className="f-label">Peso (kg)</label><input type="number" className="f-input py-2 text-sm text-center" placeholder="75" value={form.weight} onChange={e => setForm(f => ({ ...f, weight:e.target.value }))}/></div>
            <div><label className="f-label">% Gordura</label><input type="number" className="f-input py-2 text-sm text-center" placeholder="18" value={form.body_fat} onChange={e => setForm(f => ({ ...f, body_fat:e.target.value }))}/></div>
          </div>
          <div><label className="f-label">Observações</label><textarea className="f-input resize-none text-sm" rows={2} placeholder="Evolução percebida..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes:e.target.value }))}/></div>
          <div className="flex gap-2">
            <Button className="flex-1 py-2.5 text-sm" onClick={save}>Salvar</Button>
            <Button variant="ghost" className="px-4" onClick={() => setShowAdd(false)}>Cancelar</Button>
          </div>
        </div>
      )}
      {items.length === 0 && !showAdd && <EmptyState icon="📊" title="Nenhuma avaliação" description="Registre peso e composição corporal."/>}
      {items.map(a => (
        <div key={a.id} className="f-card p-4">
          <p className="font-display text-base uppercase tracking-wide mb-2" style={{ color:'var(--text-1)' }}>
            {new Date(a.date+'T12:00').toLocaleDateString('pt-BR',{ day:'2-digit', month:'long', year:'numeric' })}
          </p>
          <div className="flex gap-3 mb-2">
            {a.weight && <div className="f-card px-4 py-2 text-center flex-1" style={{ background:'var(--surface)' }}><p className="font-display text-xl" style={{ color:'var(--accent)' }}>{a.weight}kg</p><p className="text-xs" style={{ color:'var(--text-3)' }}>Peso</p></div>}
            {a.body_fat && <div className="f-card px-4 py-2 text-center flex-1" style={{ background:'var(--surface)' }}><p className="font-display text-xl" style={{ color:'var(--accent)' }}>{a.body_fat}%</p><p className="text-xs" style={{ color:'var(--text-3)' }}>Gordura</p></div>}
          </div>
          {a.notes && <p className="text-sm italic" style={{ color:'var(--text-3)' }}>"{a.notes}"</p>}
        </div>
      ))}
    </div>
  )
}

// O aluno só VISUALIZA os programas que o personal criou — quem monta o
// programa é sempre o personal (ver ProgramsTrainer em PersonalDashboardView).
// Antes, esta tela tinha um formulário de criação completo ("+ Novo") do
// lado do aluno, mas a policy prog_student_read no banco só permite SELECT
// para o aluno — o insert sempre falhava com erro de RLS, silenciosamente,
// porque o componente não checava o `error` retornado pelo service. O aluno
// preenchia o formulário, clicava "Salvar", e nada acontecia, sem nenhuma
// explicação visível.
function Programs({ studentId }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    programService.getForStudent(studentId)
      .then(({ data }) => { setItems(data || []); setLoading(false) })
      .catch(err => { console.error('[Voryn] Programs (aluno) falhou:', err); setLoading(false) })
  }, [studentId])

  if (loading) return <p className="text-sm" style={{ color: 'var(--text-3)' }}>Carregando...</p>

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:'var(--text-3)' }}>{items.length} programas</p>
      {items.length === 0 && <EmptyState icon="📋" title="Nenhum programa" description="Seu personal ainda não criou programas."/>}
      {items.map(p => (
        <div key={p.id} className="f-card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background:'rgba(var(--accent-rgb),.1)', border:'1px solid rgba(var(--accent-rgb),.2)' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          </div>
          <div>
            <p className="font-display text-lg uppercase tracking-wide" style={{ color:'var(--text-1)' }}>{p.name}</p>
            {(p.start_date||p.end_date) && <p className="text-xs" style={{ color:'var(--text-3)' }}>{p.start_date && `Início: ${new Date(p.start_date+'T12:00').toLocaleDateString('pt-BR')}`}{p.start_date&&p.end_date&&' · '}{p.end_date && `Término: ${new Date(p.end_date+'T12:00').toLocaleDateString('pt-BR')}`}</p>}
            {p.description && <p className="text-sm mt-1" style={{ color:'var(--text-3)' }}>{p.description}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PersonalView() {
  const { user } = useAuth()
  const toast = useToast()
  const [trainerData, setTrainerData] = useState(null)
  const [subtab,      setSubtab]      = useState('overview')
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!user) return
    // Esta é a tela de ENTRADA do aluno ao abrir "Personal" — mesmo risco já
    // identificado e corrigido no dashboard do personal (PersonalDashboardView):
    // sem .catch(), uma falha de rede aqui travava esta tela em "carregando"
    // para sempre, porque setLoading(false) só existia dentro do .then() de
    // sucesso.
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.from('trainer_students')
        .select('*, trainer:trainers(*, user:users(name,email))')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .single()
        .then(({ data }) => {
          if (data) setTrainerData({ ...data.trainer, trainerId: data.trainer.id, linkId: data.id })
          setLoading(false)
        })
        .catch(err => {
          console.error('[Voryn] PersonalView: falha ao carregar dados do trainer:', err)
          setLoading(false)
        })
    }).catch(err => {
      console.error('[Voryn] PersonalView: falha ao importar supabase client:', err)
      setLoading(false)
    })
  }, [user])

  // ANTES, "remover personal" só fazia setTrainerData(null) — limpava o
  // estado local do React, sem nunca persistir no banco. O aluno via a tela
  // mudar para "Sem Personal Trainer", mas o vínculo em trainer_students
  // continuava ativo: ao recarregar a página o personal voltava a aparecer,
  // e o aluno continuava contando contra o limite de alunos do plano do
  // personal sem que ninguém soubesse que ele tinha "saído".
  async function handleRemove() {
    if (!trainerData?.linkId) { setTrainerData(null); return }
    const { supabase } = await import('@/lib/supabase')
    const { error } = await supabase
      .from('trainer_students')
      .update({ status: 'inactive' })
      .eq('id', trainerData.linkId)
    if (error) { toast.error('Não foi possível desvincular. Tente novamente.'); return }
    setTrainerData(null)
    toast.success('Você foi desvinculado do personal.')
  }

  if (loading) return <div className="px-4 pt-12 text-center" style={{ color:'var(--text-3)' }}>Carregando...</div>

  if (!trainerData) {
    return (
        <div className="px-4 pt-6 pb-4">
          <h1 className="font-display text-3xl uppercase tracking-wide mb-6" style={{ color:'var(--text-1)' }}>Personal</h1>
          <div className="flex flex-col items-center justify-center min-h-64 gap-6 text-center">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
              style={{ background:'rgba(var(--accent-rgb),.1)', border:'1.5px solid rgba(var(--accent-rgb),.2)' }}>
              <svg width="44" height="44" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="1.4">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div>
              <h2 className="font-display text-2xl uppercase tracking-wide mb-2" style={{ color:'var(--text-1)' }}>Sem Personal Trainer</h2>
              <p className="text-sm" style={{ color:'var(--text-3)' }}>Peça ao seu personal para te adicionar na plataforma.</p>
            </div>
          </div>
        </div>
    )
  }

  return (
    <div className="pb-4">
      <div className="px-4 pt-6 pb-3">
        <h1 className="font-display text-3xl uppercase tracking-wide" style={{ color:'var(--text-1)' }}>Personal</h1>
        <p className="text-sm mt-0.5" style={{ color:'var(--text-3)' }}>
          Acompanhamento com <span style={{ color:'var(--accent)', fontWeight:600 }}>{trainerData.user?.name?.split(' ')[0]}</span>
        </p>
      </div>

      {/* Subtabs */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 p-1 rounded-xl" style={{ background:'var(--surface)', border:'1px solid var(--border)' }}>
          {SUBTABS.map(st => (
            <button key={st.id} onClick={() => setSubtab(st.id)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: subtab===st.id ? 'var(--card)' : 'transparent',
                color:      subtab===st.id ? 'var(--accent)' : 'var(--text-3)',
                border:     subtab===st.id ? '1px solid var(--border)' : '1px solid transparent',
              }}>
              {st.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {subtab==='overview'    && <TrainerOverview data={trainerData} onRemove={handleRemove}/>}
        {subtab==='chat'        && trainerData.trainerId && <Chat trainerId={trainerData.trainerId} studentId={user.id} userId={user.id}/>}
        {subtab==='assessments' && <Assessments studentId={user.id} trainerId={trainerData.trainerId}/>}
        {subtab==='programs'    && <Programs studentId={user.id}/>}
      </div>
    </div>
  )
}
