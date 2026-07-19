import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { communityService, friendService } from '@/services'
import { Button, Badge, Modal, EmptyState } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { formatDateShort } from '@/utils/helpers'

export default function CommunityView() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') === 'amigos' ? 'amigos' : 'grupos')
  const [selectedCommunity, setSelectedCommunity] = useState(null)
  const [selectedFriend,    setSelectedFriend]    = useState(null)

  if (selectedCommunity) {
    return <CommunityDetail community={selectedCommunity} userId={user.id}
      onBack={() => setSelectedCommunity(null)}
      onLeft={() => setSelectedCommunity(null)}/>
  }
  if (selectedFriend) {
    return <FriendDetail friend={selectedFriend} onBack={() => setSelectedFriend(null)}/>
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <h1 className="font-display text-3xl uppercase tracking-wide mb-4" style={{ color: 'var(--text-1)' }}>Comunidade</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 p-1 rounded-xl" style={{ background: 'var(--surface)' }}>
        {[['grupos', 'Grupos'], ['amigos', 'Amigos']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: tab === id ? 'var(--accent)' : 'transparent',
              color: tab === id ? '#fff' : 'var(--text-3)',
            }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'grupos'
        ? <GroupsTab userId={user.id} onSelect={setSelectedCommunity}/>
        : <FriendsTab userId={user.id} onSelect={setSelectedFriend}/>}
    </div>
  )
}

// ── Aba Grupos ──────────────────────────────────────────────
function GroupsTab({ userId, onSelect }) {
  const { isPayingUser } = useAuth()
  const toast = useToast()
  const [communities, setCommunities] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showCreate,  setShowCreate]  = useState(false)

  useEffect(() => {
    communityService.getMine(userId).then(({ data }) => {
      setCommunities(data)
      setLoading(false)
    })
  }, [userId])

  function handleCreated(newCommunity) {
    setCommunities(c => [{ ...newCommunity, myRole: 'creator' }, ...c])
    setShowCreate(false)
    toast.success('Comunidade criada! 🎉')
  }

  return (
    <>
      <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
        Grupos fechados — só entra quem recebe o link de convite.
      </p>

      {isPayingUser && (
        <Button size="lg" className="w-full mb-6" onClick={() => setShowCreate(true)}>
          + Criar comunidade
        </Button>
      )}

      {loading ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>Carregando...</p>
      ) : communities.length === 0 ? (
        <EmptyState icon="👥" title="Nenhuma comunidade ainda"
          description={isPayingUser
            ? 'Crie um grupo e chame seus amigos de treino, ou entre em um pelo link de convite que alguém te mandar.'
            : 'Entre em um grupo pelo link de convite que alguém te mandar, ou assine um plano para criar o seu.'}/>
      ) : (
        <div className="space-y-2">
          {communities.map(c => (
            <button key={c.id} onClick={() => onSelect(c)}
              className="f-card w-full p-4 flex items-center gap-3 text-left">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(var(--accent-rgb),.1)' }}>
                <span className="text-lg">👥</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>{c.name}</p>
                {c.description && <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{c.description}</p>}
              </div>
              {c.myRole === 'creator' && <Badge variant="accent">criador</Badge>}
            </button>
          ))}
        </div>
      )}

      <CreateCommunityModal open={showCreate} onClose={() => setShowCreate(false)}
        userId={userId} onCreated={handleCreated}/>
    </>
  )
}

function CreateCommunityModal({ open, onClose, userId, onCreated }) {
  const toast = useToast()
  const [name,        setName]        = useState('')
  const [description, setDescription] = useState('')
  const [saving,       setSaving]      = useState(false)

  async function handleCreate() {
    if (!name.trim() || saving) return
    setSaving(true)
    const { data, error } = await communityService.create(userId, name.trim(), description.trim() || null)
    setSaving(false)
    if (error) {
      // Mostra o motivo real quando é um caso conhecido — "não foi
      // possível agora" genérico só deixava a pessoa sem saber se era pra
      // tentar de novo, assinar um plano, ou avisar o suporte.
      const msg = String(error.message || '')
      if (msg.includes('assinatura ativa')) {
        toast.error('Criar uma comunidade exige assinatura ativa.')
      } else {
        toast.error('Não foi possível criar a comunidade agora.')
      }
      return
    }
    setName(''); setDescription('')
    onCreated(data)
  }

  return (
    <Modal open={open} onClose={onClose} title="Criar comunidade">
      <div className="space-y-3">
        <div>
          <label className="f-label mb-1 block">Nome</label>
          <input className="f-input" placeholder="Ex: Treino dos Guerreiros"
            value={name} onChange={e => setName(e.target.value)} autoFocus/>
        </div>
        <div>
          <label className="f-label mb-1 block">Descrição (opcional)</label>
          <input className="f-input" placeholder="Ex: Galera que treina junto de manhã"
            value={description} onChange={e => setDescription(e.target.value)}/>
        </div>
        <Button size="lg" className="w-full" onClick={handleCreate} loading={saving} disabled={!name.trim()}>
          Criar
        </Button>
      </div>
    </Modal>
  )
}

function CommunityDetail({ community, userId, onBack, onLeft }) {
  const toast = useToast()
  const [members,  setMembers]  = useState([])
  const [prFeed,   setPrFeed]   = useState([])
  const [activity, setActivity] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [copied,   setCopied]   = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [detailTab, setDetailTab] = useState('chat') // 'chat' | 'sobre'

  const isCreator = community.myRole === 'creator' || community.creator_id === userId
  const inviteLink = `${window.location.origin}/community/join/${community.invite_code}`

  useEffect(() => {
    Promise.all([
      communityService.getMembers(community.id),
      communityService.getPrFeed(community.id),
      communityService.getActivity(community.id),
    ]).then(([m, p, a]) => {
      setMembers(m.data)
      setPrFeed(p.data)
      setActivity(a.data)
      setLoading(false)
    })
  }, [community.id])

  // Mesmo fallback já corrigido em PersonalInviteGuide.jsx: navigator.clipboard
  // só existe em contexto seguro (HTTPS) — testando pelo IP da rede local
  // (http comum), fica undefined e quebra silenciosamente sem esse fallback.
  async function copyInvite() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(inviteLink)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = inviteLink
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        if (!ok) throw new Error('execCommand copy failed')
      }
      setCopied(true)
      toast.success('Link copiado! Manda pelo WhatsApp.')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error('Não foi possível copiar. Copie manualmente: ' + inviteLink)
    }
  }

  async function handleLeave() {
    const { error } = await communityService.leave(community.id, userId)
    if (error) { toast.error('Não foi possível sair agora.'); return }
    toast.success('Você saiu do grupo.')
    onLeft()
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <button onClick={onBack} className="flex items-center gap-2 text-sm mb-4" style={{ color: 'var(--text-3)' }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Voltar
      </button>

      <h1 className="font-display text-2xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>{community.name}</h1>
      {community.description && <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{community.description}</p>}

      {/* Sub-tabs: Chat (padrão) | Sobre */}
      <div className="flex gap-2 my-4 p-1 rounded-xl" style={{ background: 'var(--surface)' }}>
        {[['chat', '💬 Chat'], ['sobre', 'ℹ️ Sobre']].map(([id, label]) => (
          <button key={id} onClick={() => setDetailTab(id)}
            className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: detailTab === id ? 'var(--accent)' : 'transparent',
              color: detailTab === id ? '#fff' : 'var(--text-3)',
            }}>
            {label}
          </button>
        ))}
      </div>

      {detailTab === 'chat' ? (
        <ChatCommunity communityId={community.id} userId={userId} members={members}/>
      ) : loading ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>Carregando...</p>
      ) : (
        <>
          {/* Invite link */}
          <div className="f-card p-3.5 mb-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Link de convite</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{inviteLink}</p>
            </div>
            <Button size="sm" onClick={copyInvite} className="flex-shrink-0">
              {copied ? '✓ Copiado' : 'Copiar'}
            </Button>
          </div>

          {/* Membros + atividade da semana */}
          <div className="mt-6">
            <p className="f-label mb-2">Membros · {members.length}</p>
            <div className="space-y-2">
              {activity.map(a => (
                <div key={a.user_id} className="f-card p-3 flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{a.user_name}</span>
                  <span className="text-xs" style={{ color: a.workouts_7d > 0 ? 'var(--accent)' : 'var(--text-3)' }}>
                    {a.workouts_7d} treino{a.workouts_7d !== 1 ? 's' : ''} esta semana
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Feed de PRs */}
          <div className="mt-6">
            <p className="f-label mb-2">Recordes recentes</p>
            {prFeed.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Ninguém bateu recorde nos últimos 30 dias ainda.</p>
            ) : (
              <div className="space-y-2">
                {prFeed.map((p, i) => (
                  <div key={i} className="f-card p-3 flex items-center gap-3">
                    <span className="text-lg flex-shrink-0">🏆</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ color: 'var(--text-1)' }}>
                        <span className="font-semibold">{p.user_name}</span> bateu recorde em {p.exercise}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                        {p.weight}kg × {p.reps} · {formatDateShort(p.pr_date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sair do grupo */}
          <div className="mt-8 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            {!confirmLeave ? (
              <button onClick={() => setConfirmLeave(true)}
                className="text-xs" style={{ color: 'rgba(239,68,68,.6)' }}>
                {isCreator ? 'Excluir comunidade' : 'Sair do grupo'}
              </button>
            ) : (
              <div className="f-card p-3.5 space-y-2" style={{ borderColor: 'rgba(239,68,68,.3)' }}>
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                  {isCreator
                    ? 'Como você criou o grupo, sair remove sua participação, mas o grupo continua existindo para os outros membros.'
                    : 'Você pode entrar de novo depois, se alguém te mandar o link.'}
                </p>
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={handleLeave}>Confirmar</Button>
                  <button onClick={() => setConfirmLeave(false)} className="text-xs px-3" style={{ color: 'var(--text-3)' }}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function ChatCommunity({ communityId, userId, members }) {
  const [msgs,    setMsgs]    = useState([])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  // Nome de quem mandou, resolvido pela lista de membros já carregada —
  // ver comentário em get_community_members (schema.sql) sobre por que
  // isso vem de uma RPC com campo plano (user_name), não de um join
  // aninhado.
  const nameById = {}
  members.forEach(m => { nameById[m.user_id] = m.user_name || '?' })

  // Mesmo bug já corrigido no chat personal↔aluno (ChatTrainer, mais
  // acima neste arquivo... na verdade em PersonalDashboardView.jsx): ao
  // enviar, a mensagem sendo adicionada manualmente E chegando de volta
  // via Realtime duplicava na tela de quem enviou. addMsg ignora se o id
  // já existir no estado local.
  function addMsg(msg) {
    setMsgs(m => m.some(x => x.id === msg.id) ? m : [...m, msg])
  }

  useEffect(() => {
    if (!communityId) return
    communityService.getMessages(communityId).then(({ data }) => {
      setMsgs(data || [])
      setLoading(false)
    })
    const sub = communityService.subscribeMessages(communityId, msg => addMsg(msg))
    return () => sub?.unsubscribe?.()
  }, [communityId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  async function send() {
    const text = input.trim(); if (!text) return
    setInput('')
    const { data, error } = await communityService.sendMessage(communityId, userId, text)
    if (data) addMsg(data)
    if (error) console.error('[Voryn] ChatCommunity send error:', error)
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 320px)' }}>
      <div className="flex-1 overflow-y-auto space-y-3 py-2">
        {loading ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>Carregando...</p>
        ) : msgs.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>
            Nenhuma mensagem ainda. Manda um "oi" pro grupo 👋
          </p>
        ) : (
          msgs.map(m => {
            const isMe = m.user_id === userId
            return (
              <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-xs">
                  {!isMe && (
                    <p className="text-xs mb-0.5 ml-1" style={{ color: 'var(--text-3)' }}>
                      {nameById[m.user_id] || 'Membro'}
                    </p>
                  )}
                  <div className="px-4 py-2.5 rounded-2xl text-sm"
                    style={{
                      background: isMe ? 'var(--accent)' : 'var(--card)',
                      color: isMe ? '#fff' : 'var(--text-1)',
                      border: isMe ? 'none' : '1px solid var(--border)',
                    }}>
                    {m.content}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef}/>
      </div>
      <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <input className="f-input flex-1" placeholder="Mensagem para o grupo..." value={input}
          onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}/>
        <button onClick={send} className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--accent)' }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── Aba Amigos ──────────────────────────────────────────────
function FriendsTab({ userId, onSelect }) {
  const { profile } = useAuth()
  const toast = useToast()
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied,  setCopied]  = useState(false)

  const myLink = `${window.location.origin}/friend/add/${profile?.friend_invite_code || ''}`

  useEffect(() => {
    friendService.getMyFriends().then(({ data }) => {
      setFriends(data)
      setLoading(false)
    })
  }, [userId])

  async function copyMyLink() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(myLink)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = myLink
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        if (!ok) throw new Error('execCommand copy failed')
      }
      setCopied(true)
      toast.success('Link copiado! Manda pra quem você quiser conectar.')
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error('Não foi possível copiar. Copie manualmente: ' + myLink)
    }
  }

  return (
    <>
      <p className="text-sm mb-4" style={{ color: 'var(--text-3)' }}>
        Conexão direta com uma pessoa — sem grupo, sem nome. Vocês veem a frequência e os recordes um do outro.
      </p>

      {/* Meu link pessoal */}
      <div className="f-card p-3.5 mb-6 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Seu link pessoal</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{myLink}</p>
        </div>
        <Button size="sm" onClick={copyMyLink} className="flex-shrink-0" disabled={!profile?.friend_invite_code}>
          {copied ? '✓ Copiado' : 'Copiar'}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>Carregando...</p>
      ) : friends.length === 0 ? (
        <EmptyState icon="🤝" title="Nenhuma conexão ainda"
          description="Manda seu link pessoal pra um amigo, ou peça o link dele pra vocês se conectarem."/>
      ) : (
        <div className="space-y-2">
          {friends.map(f => (
            <button key={f.friend_id} onClick={() => onSelect(f)}
              className="f-card w-full p-4 flex items-center gap-3 text-left">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-display text-lg"
                style={{ background: 'rgba(var(--accent-rgb),.1)', color: 'var(--accent)' }}>
                {f.friend_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>{f.friend_name}</p>
                <p className="text-xs" style={{ color: f.workouts_7d > 0 ? 'var(--accent)' : 'var(--text-3)' }}>
                  {f.workouts_7d} treino{f.workouts_7d !== 1 ? 's' : ''} esta semana
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function FriendDetail({ friend, onBack }) {
  const toast = useToast()
  const [prs,     setPrs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    friendService.getFriendPrs(friend.friend_id).then(({ data }) => {
      setPrs(data)
      setLoading(false)
    })
  }, [friend.friend_id])

  async function handleRemove() {
    const { error } = await friendService.removeFriend(friend.friend_id, user.id)
    if (error) { toast.error('Não foi possível desfazer a conexão agora.'); return }
    toast.success('Conexão desfeita.')
    onBack()
  }

  return (
    <div className="px-4 pt-6 pb-8">
      <button onClick={onBack} className="flex items-center gap-2 text-sm mb-4" style={{ color: 'var(--text-3)' }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Voltar
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 font-display text-2xl"
          style={{ background: 'rgba(var(--accent-rgb),.1)', color: 'var(--accent)' }}>
          {friend.friend_name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div>
          <p className="font-display text-xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>{friend.friend_name}</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {friend.workouts_7d} treino{friend.workouts_7d !== 1 ? 's' : ''} nos últimos 7 dias
          </p>
        </div>
      </div>

      <p className="f-label mb-2">Recordes</p>
      {loading ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-3)' }}>Carregando...</p>
      ) : prs.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>Nenhum recorde registrado ainda.</p>
      ) : (
        <div className="space-y-2">
          {prs.map((p, i) => (
            <div key={i} className="f-card p-3 flex items-center gap-3">
              <span className="text-lg flex-shrink-0">🏆</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{p.exercise}</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {p.weight}kg × {p.reps} · {formatDateShort(p.pr_date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        {!confirmRemove ? (
          <button onClick={() => setConfirmRemove(true)}
            className="text-xs" style={{ color: 'rgba(239,68,68,.6)' }}>
            Desfazer conexão
          </button>
        ) : (
          <div className="f-card p-3.5 space-y-2" style={{ borderColor: 'rgba(239,68,68,.3)' }}>
            <p className="text-xs" style={{ color: 'var(--text-2)' }}>
              Vocês podem se conectar de novo depois, se alguém mandar o link.
            </p>
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={handleRemove}>Confirmar</Button>
              <button onClick={() => setConfirmRemove(false)} className="text-xs px-3" style={{ color: 'var(--text-3)' }}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
