import React, { useEffect, useRef, useState } from 'react'
import { communityService, friendService } from '@/services'
import { socialProfiles } from '@/services/socialProfiles'
import { useAuth } from '@/context/AuthContext'
import Avatar from './Avatar'

const mergeMessages = (previous, incoming) => [...new Map([...previous, ...incoming].map(m => [m.id, m])).values()]
  .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

export default function SocialChat({ communityId, friendId, friendName, members = [] }) {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [profiles, setProfiles] = useState({})
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const bottom = useRef(null)
  const sendLock = useRef(false)
  const generation = useRef(0)
  const myId = user.id
  const participants = [...new Set([...members.map(m => m.user_id), ...messages.map(m => m.user_id || m.sender_id), friendId].filter(Boolean))].sort().join(',')

  useEffect(() => {
    let active = true
    generation.current += 1
    setMessages([]); setLoading(true); setError('')
    const service = communityId ? communityService : friendService
    const args = communityId ? [communityId] : [myId, friendId]
    const subscription = service.subscribeMessages(...args, message => {
      if (active) setMessages(previous => mergeMessages(previous, [message]))
    })
    service.getMessages(...args).then(({ data, error: loadError }) => {
      if (!active) return
      if (loadError) throw loadError
      setMessages(previous => mergeMessages(previous, data || []))
    }).catch(() => { if (active) setError('Não foi possível carregar a conversa. Tente novamente.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; generation.current += 1; subscription?.unsubscribe?.() }
  }, [communityId, friendId, myId, reload])

  useEffect(() => {
    let active = true
    setProfiles({})
    if (participants) socialProfiles.get(participants.split(',')).then(rows => {
      if (active) setProfiles(Object.fromEntries(rows.map(row => [row.id, row])))
    }).catch(() => {})
    return () => { active = false }
  }, [participants])

  useEffect(() => { bottom.current?.scrollIntoView?.({ behavior: 'auto', block: 'end' }) }, [messages])

  async function send(event) {
    event.preventDefault()
    const content = input.trim()
    if (!content || sendLock.current || loading) return
    sendLock.current = true; setSending(true); setError('')
    const currentGeneration = generation.current
    try {
      const { data, error: sendError } = communityId
        ? await communityService.sendMessage(communityId, myId, content)
        : await friendService.sendMessage(myId, friendId, content)
      if (sendError || !data) throw sendError || new Error('Sem confirmação')
      if (currentGeneration !== generation.current) return
      setMessages(previous => mergeMessages(previous, [data]))
      setInput('')
    } catch {
      if (currentGeneration === generation.current) setError('Mensagem não enviada. Seu texto foi mantido para tentar novamente.')
    } finally { sendLock.current = false; setSending(false) }
  }

  return <section className="social-chat" aria-label={communityId ? 'Conversa da comunidade' : `Conversa com ${friendName || 'amigo'}`}>
    <div className="social-chat-messages" role="log" aria-label="Mensagens" aria-live="polite" aria-relevant="additions">
      {loading && <p className="social-chat-empty">Carregando conversa…</p>}
      {!loading && !messages.length && !error && <p className="social-chat-empty">Comece a conversa. Envie uma mensagem!</p>}
      {messages.map((message, index) => {
        const senderId = message.user_id || message.sender_id
        const mine = senderId === myId
        const member = members.find(m => m.user_id === senderId)
        const sender = mine ? profile : profiles[senderId]
        const name = mine ? 'Você' : sender?.name || member?.user_name || friendName || 'Membro'
        const date = new Date(message.created_at)
        const validDate = !Number.isNaN(date.getTime())
        const previousDate = index ? new Date(messages[index - 1].created_at).toLocaleDateString('pt-BR') : null
        const day = validDate ? date.toLocaleDateString('pt-BR') : null
        return <React.Fragment key={message.id}>
          {day && day !== previousDate && <p className="social-chat-day">{day}</p>}
          <div className={`social-chat-row ${mine ? 'is-mine' : ''}`}>
            <Avatar name={sender?.name || name} path={sender?.avatar_url} size={32} />
            <div className="social-chat-bubble">
              <p className="social-chat-author">{name}</p>
              <p className="social-chat-text">{message.content}</p>
              {validDate && <time dateTime={date.toISOString()}>{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>}
            </div>
          </div>
        </React.Fragment>
      })}
      <div ref={bottom} />
    </div>
    {error && <div className="social-chat-error" role="alert">{error} <button type="button" onClick={() => setReload(n => n + 1)} disabled={sending}>Recarregar conversa</button></div>}
    <form className="social-chat-compose" onSubmit={send}>
      <textarea className="f-input" rows={2} maxLength={4000} aria-label="Mensagem" placeholder="Escreva uma mensagem…" value={input} disabled={sending}
        onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) send(e) }} />
      <button className="f-btn f-btn-accent" type="submit" disabled={sending || loading || !input.trim()}>{sending ? 'Enviando…' : 'Enviar'}</button>
    </form>
  </section>
}
