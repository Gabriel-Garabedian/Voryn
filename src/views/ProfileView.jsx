import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { prService, workoutLogService, routineService } from '@/services'
import { Button, Badge } from '@/components/ui'
import { useToast } from '@/components/ui/Toast'
import { pushService } from '@/services/pushNotifications'
import { exportProgressPDF, exportRoutinePDF } from '@/services/pdfExport'
import { PLANS } from '@/services/payment'
import { formatDuration, formatVolume, calcStreak, calcBestStreak } from '@/utils/helpers'
import { EXERCISE_LIBRARY } from '@/data/exercises'

// ANTES, esta lista era fixa — só esses 5 exercícios apareciam em Records
// Pessoais, sem nenhuma forma de adicionar outro (ex: "Remada Curvada" não
// servia, o usuário queria registrar outra variação) ou remover um que não
// interessa. Agora a lista vem dinamicamente do banco (quais PRs o usuário
// já registrou), com botão de adicionar/remover — ver PersonalRecordsSection.

function ThemeToggle() {
  const { theme, toggleTheme } = useAuth()
  const dark = theme === 'dark'
  return (
    <button onClick={toggleTheme}
      className="w-full f-card p-4 flex items-center justify-between transition-all">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(var(--accent-rgb),.1)', border: '1px solid rgba(var(--accent-rgb),.2)' }}>
          {dark
            ? <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
            : <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
              </svg>
          }
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
            {dark ? 'Modo Escuro' : 'Modo Claro'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Toque para alternar</p>
        </div>
      </div>
      <div className="relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0"
        style={{ background: dark ? 'var(--accent)' : 'var(--border)' }}>
        <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300"
          style={{ left: dark ? '26px' : '2px' }}/>
      </div>
    </button>
  )
}

// Seletor de cor de destaque — recurso pago (ver isPayingUser no
// AuthContext). Quem não é pagante vê as opções desabilitadas, com aviso
// de que é preciso assinar (ou ter acesso via personal) para usar.
const ACCENT_COLORS = [
  { id: 'purple', label: 'Roxo (padrão)', hex: '#820AD1' },
  { id: 'blue',   label: 'Azul',          hex: '#2563EB' },
  { id: 'green',  label: 'Verde',         hex: '#16A34A' },
  { id: 'orange', label: 'Laranja',       hex: '#EA580C' },
  { id: 'red',    label: 'Vermelho',      hex: '#DC2626' },
  { id: 'pink',   label: 'Rosa',          hex: '#DB2777' },
  { id: 'cyan',   label: 'Ciano',         hex: '#0891B2' },
  { id: 'amber',  label: 'Âmbar',         hex: '#D97706' },
]

function AccentColorPicker() {
  const { accentColor, setAccentColor, isPayingUser } = useAuth()
  return (
    <div className="f-card p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Cor do app</p>
        {!isPayingUser && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(var(--accent-rgb),.12)', color: 'var(--accent)' }}>
            PREMIUM
          </span>
        )}
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>
        {isPayingUser
          ? 'Escolha a cor de destaque do app.'
          : 'Disponível para quem tem assinatura ativa (ou acesso pelo plano do personal).'}
      </p>
      <div className="grid grid-cols-4 gap-2.5">
        {ACCENT_COLORS.map(c => {
          const selected = accentColor === c.id
          const locked   = !isPayingUser && c.id !== 'purple'
          return (
            <button key={c.id}
              disabled={locked}
              onClick={() => !locked && setAccentColor(c.id)}
              title={locked ? 'Disponível só para assinantes' : c.label}
              className="aspect-square rounded-xl flex items-center justify-center transition-all"
              style={{
                background: c.hex,
                opacity: locked ? .35 : 1,
                cursor: locked ? 'not-allowed' : 'pointer',
                border: selected ? '2.5px solid var(--text-1)' : '2.5px solid transparent',
                boxShadow: selected ? '0 0 0 2px var(--card)' : 'none',
              }}>
              {selected && (
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
              {locked && (
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="2.5">
                  <rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>
                </svg>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ProfileView() {
  const { profile, user, plan, subStatus, signOut, updateProfile, deleteAccount, isPersonal } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [prs,         setPRs]         = useState({})
  const [logs,        setLogs]        = useState([])
  const [metrics,     setMetrics]     = useState(null)
  const [editingPR,   setEditingPR]   = useState(null)
  const [prInput,     setPrInput]     = useState('')
  const [addingPR,    setAddingPR]    = useState(false)
  const [newPRName,   setNewPRName]   = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [editName,    setEditName]    = useState(false)
  const [nameInput,   setNameInput]   = useState(profile?.name || '')
  const [editSpotify,  setEditSpotify]  = useState(false)
  const [spotifyInput, setSpotifyInput] = useState(profile?.spotify_url || '')
  const [showDelete,  setShowDelete]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [pushPerm,    setPushPerm]    = useState(() => pushService.isSupported() ? Notification.permission : 'unsupported')

  useEffect(() => {
    if (!user) return
    // Não aplica o gate de historyDays aqui (ver workoutLogService.getAll/
    // HistoryView): este logs é usado só para exportação de PDF ("Exportar
    // meus dados" abaixo), que deve sempre conter o histórico completo —
    // é portabilidade de dados, não a vitrine de "veja seu histórico" que
    // o plano paga para desbloquear.
    prService.getAll(user.id).then(({ data }) => setPRs(data || {})).catch(err => console.error('[Voryn] ProfileView (PRs) falhou:', err))
    workoutLogService.getAll(user.id).then(({ data }) => setLogs(data || [])).catch(err => console.error('[Voryn] ProfileView (logs) falhou:', err))
    workoutLogService.getMetrics(user.id).then(m => setMetrics(m)).catch(err => console.error('[Voryn] ProfileView (metrics) falhou:', err))
  }, [user])

  async function savePR(key) {
    const val = parseFloat(prInput)
    if (isNaN(val) || val <= 0) { setEditingPR(null); return }
    const { data } = await prService.upsert(user.id, key, val)
    if (data) { setPRs(p => ({ ...p, [key]: data })); toast.success('PR salvo! 💪') }
    setEditingPR(null)
    setPrInput('')
  }

  // Novo: adicionar um exercício à lista de Records Pessoais. Antes, a
  // lista era fixa (5 nomes hardcoded) — agora qualquer exercício pode
  // ser registrado.
  async function addPR() {
    const name = newPRName.trim()
    if (!name) return
    if (prs[name]) { toast.error('Esse exercício já está na sua lista.'); setAddingPR(false); setNewPRName(''); return }
    const { data, error } = await prService.upsert(user.id, name, 0)
    if (error) { toast.error('Erro ao adicionar exercício.'); return }
    setPRs(p => ({ ...p, [name]: data }))
    setAddingPR(false)
    setNewPRName('')
    setEditingPR(name) // abre direto pra já preencher o peso
    setPrInput('')
  }

  // Novo: remover um exercício da lista de Records Pessoais (ex: o aluno
  // não treina mais supino reto, prefere outra variação).
  async function deletePR(key) {
    const { error } = await prService.delete(user.id, key)
    if (error) { toast.error('Erro ao remover exercício.'); return }
    setPRs(p => { const n = { ...p }; delete n[key]; return n })
    toast.success('Exercício removido.')
  }

  async function saveName() {
    if (!nameInput.trim()) { setEditName(false); return }
    await updateProfile({ name: nameInput.trim() })
    setEditName(false)
    toast.success('Nome atualizado!')
  }

  async function saveSpotify() {
    const url = spotifyInput.trim()
    // Validação leve — só confere se parece um link do Spotify, não exige
    // formato exato nem valida contra a API deles (sem OAuth de propósito,
    // ver comentário no schema.sql). Campo vazio limpa o link salvo.
    if (url && !url.includes('spotify.com')) {
      toast.error('Isso não parece um link do Spotify. Copie o link de compartilhar da playlist.')
      return
    }
    await updateProfile({ spotify_url: url || null })
    setEditSpotify(false)
    toast.success(url ? 'Playlist salva!' : 'Playlist removida.')
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError('')
    const { error } = await deleteAccount()
    if (error) {
      setDeleting(false)
      setDeleteError(error.message || 'Não foi possível excluir agora. Tente novamente ou envie um email para privacidade@vorynapp.com.br')
      return
    }
    // deleteAccount() já limpa a sessão local — navega para a landing.
    // Não precisa setDeleting(false) aqui: o componente desmonta junto
    // com a navegação.
    navigate('/')
  }

  const statusMap = {
    active:   { label: 'Ativo',     variant: 'green'  },
    trialing: { label: 'Trial',     variant: 'yellow' },
    canceled: { label: 'Cancelado', variant: 'red'    },
    past_due: { label: 'Vencido',   variant: 'red'    },
    inactive: { label: 'Inativo',   variant: 'red'    },
  }
  const statusInfo = statusMap[subStatus] || statusMap.inactive
  const planInfo   = PLANS[plan]

  const totalVolume  = logs.reduce((a, l) => a + (parseFloat(l.total_volume) || 0), 0)
  const avgDuration  = logs.length ? Math.round(logs.reduce((a,l) => a+(l.duration||0), 0) / logs.length) : 0
  const streak       = calcStreak(logs.map(l => l.date))
  const bestStreak   = calcBestStreak(logs.map(l => l.date))

  return (
    <div className="px-4 pt-6 pb-10 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
            Perfil
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{user?.email}</p>
        </div>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(var(--accent-rgb),.1)', border: '1.5px solid rgba(var(--accent-rgb),.25)' }}>
          <span className="font-display text-2xl" style={{ color: 'var(--accent)' }}>
            {profile?.name?.charAt(0)?.toUpperCase() || 'A'}
          </span>
        </div>
      </div>

      {/* User card */}
      <div className="f-card p-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,rgba(var(--accent-rgb),.2),rgba(var(--accent-rgb),.05))', border: '1.5px solid rgba(var(--accent-rgb),.2)' }}>
          <span className="font-display text-3xl" style={{ color: 'var(--accent)' }}>
            {profile?.name?.charAt(0)?.toUpperCase() || 'A'}
          </span>
        </div>
        <div className="flex-1">
          {editName
            ? <div className="flex items-center gap-2">
                <input className="f-input py-1 text-sm flex-1" value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveName()}
                  autoFocus/>
                <button onClick={saveName} className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>OK</button>
                <button onClick={() => setEditName(false)} className="text-xs" style={{ color: 'var(--text-3)' }}>✕</button>
              </div>
            : <div className="flex items-center gap-2">
                <p className="font-display text-xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
                  {profile?.name}
                </p>
                <button onClick={() => { setEditName(true); setNameInput(profile?.name || '') }}
                  style={{ color: 'var(--text-3)' }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
          }
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{user?.email}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="accent">{planInfo?.name || 'Grátis'}</Badge>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            {profile?.goal && <Badge variant="green">🎯 {profile.goal}</Badge>}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Treinos',   value: logs.length },
          { label: 'Sequência', value: streak },
          { label: 'Melhor',    value: bestStreak },
          { label: 'Avg',       value: formatDuration(avgDuration) },
        ].map(s => (
          <div key={s.label} className="f-card p-3 text-center">
            <div className="font-display text-xl" style={{ color: 'var(--accent)' }}>{s.value}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {totalVolume > 0 && (
        <div className="f-card p-3 flex items-center justify-between"
          style={{ borderColor: 'rgba(var(--accent-rgb),.25)', background: 'rgba(var(--accent-rgb),.04)' }}>
          <span className="text-sm" style={{ color: 'var(--text-2)' }}>🏋️ Volume total acumulado</span>
          <span className="font-display text-xl" style={{ color: 'var(--accent)' }}>
            {formatVolume(totalVolume)}
          </span>
        </div>
      )}

      {/* ── Assinatura ── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
        <p className="f-label mb-2">Assinatura</p>
        <div className="f-card p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
              {planInfo?.name || 'Plano Grátis'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
              {planInfo ? `R$ ${planInfo.price.toFixed(2).replace('.', ',')} / mês` : '7 dias de teste grátis'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/subscription')}>
            Gerenciar
          </Button>
        </div>
      </div>

      {/* ── Notificações ── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
        <p className="f-label mb-2">Notificações</p>
        <div className="f-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background:'rgba(var(--accent-rgb),.1)', border:'1px solid rgba(var(--accent-rgb),.2)' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color:'var(--text-1)' }}>Lembretes de treino</p>
              <p className="text-xs" style={{ color:'var(--text-3)' }}>
                {pushPerm === 'granted' ? 'Ativado' : pushPerm === 'denied' ? 'Bloqueado no navegador' : pushPerm === 'unsupported' ? 'Não suportado' : 'Desativado'}
              </p>
            </div>
          </div>
          {pushPerm === 'default' && (
            <button
              onClick={async () => {
                const r = await pushService.subscribe(user?.id)
                setPushPerm(r.error ? 'denied' : 'granted')
                if (!r.error) toast.success('Notificações ativadas! 🔔')
                else toast.error('Não foi possível ativar. Verifique as permissões do navegador.')
              }}
              className="text-xs font-semibold px-3 py-2 rounded-xl"
              style={{ background:'rgba(var(--accent-rgb),.1)', color:'var(--accent)', border:'1px solid rgba(var(--accent-rgb),.25)' }}>
              Ativar
            </button>
          )}
          {pushPerm === 'granted' && (
            <div className="w-2 h-2 rounded-full" style={{ background:'#4ade80' }}/>
          )}
        </div>
      </div>

      {/* ── Aparência ── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
        <p className="f-label mb-2">Aparência</p>
        <div className="space-y-3">
          <ThemeToggle />
          <AccentColorPicker />
        </div>
      </div>

      {/* ── Playlist de treino (Spotify) ── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
        <p className="f-label mb-2">Playlist de treino</p>
        <div className="f-card p-3.5">
          {editSpotify ? (
            <div className="flex items-center gap-2">
              <input className="f-input py-2 text-sm flex-1"
                placeholder="Cole o link da playlist do Spotify"
                value={spotifyInput}
                onChange={e => setSpotifyInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveSpotify()}
                autoFocus/>
              <button onClick={saveSpotify} className="text-xs font-semibold flex-shrink-0" style={{ color: 'var(--accent)' }}>OK</button>
              <button onClick={() => setEditSpotify(false)} className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)' }}>✕</button>
            </div>
          ) : profile?.spotify_url ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#1DB95420' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1DB954">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </div>
              <a href={profile.spotify_url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>Ver playlist no Spotify</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{profile.spotify_url}</p>
              </a>
              <button onClick={() => { setEditSpotify(true); setSpotifyInput(profile.spotify_url) }}
                className="flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          ) : (
            <button onClick={() => setEditSpotify(true)}
              className="w-full flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface)' }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="var(--text-3)" strokeWidth="2">
                  <path d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zM21 16a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Adicionar playlist</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Colegas de treino vinculados a você poderão ver e ouvir</p>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* ── PRs ── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="f-label">Recordes Pessoais</p>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>em kg</span>
        </div>
        <div className="space-y-2">
          {Object.keys(prs).length === 0 && !addingPR && (
            <p className="text-xs text-center py-4" style={{ color: 'var(--text-3)' }}>
              Nenhum exercício adicionado ainda.
            </p>
          )}
          {Object.keys(prs).sort().map(key => (
            <div key={key} className="f-card p-4 flex items-center gap-4">
              <span className="text-2xl flex-shrink-0">🏋️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{key}</p>
                {editingPR === key
                  ? <div className="flex items-center gap-2 mt-1">
                      <input autoFocus type="number" inputMode="decimal"
                        className="f-input py-1 text-sm" style={{ maxWidth: 100 }}
                        placeholder="kg" value={prInput}
                        onChange={e => setPrInput(e.target.value)}
                        onKeyDown={e => { if (e.key==='Enter') savePR(key); if (e.key==='Escape') setEditingPR(null) }}/>
                      <button onClick={() => savePR(key)}
                        className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
                        Salvar
                      </button>
                      <button onClick={() => setEditingPR(null)}
                        className="text-sm" style={{ color: 'var(--text-3)' }}>✕</button>
                    </div>
                  : <p className="text-xs mt-0.5">
                      {prs[key]?.weight
                        ? <span className="font-display text-base" style={{ color: 'var(--accent)' }}>
                            {prs[key].weight} kg
                          </span>
                        : <span style={{ color: 'rgba(var(--accent-rgb),.3)' }}>Não registrado</span>
                      }
                    </p>
                }
              </div>
              {editingPR !== key && (
                <>
                  <button
                    onClick={() => { setEditingPR(key); setPrInput(prs[key]?.weight || '') }}
                    className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--text-3)' }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  {/* Remover exercício — antes não existia nenhuma forma de
                      tirar um exercício da lista de PRs. */}
                  <button
                    onClick={() => deletePR(key)}
                    title="Remover este exercício"
                    className="p-1.5 rounded-lg transition-colors" style={{ color: '#f87171' }}>
                    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))}

          {/* Adicionar exercício novo — antes a lista era fixa (5 nomes
              hardcoded), sem nenhuma forma de adicionar outro. */}
          {addingPR ? (
            <div className="f-card p-4 space-y-2" style={{ borderColor: 'rgba(var(--accent-rgb),.3)' }}>
              <input autoFocus list="exercise-suggestions" className="f-input text-sm"
                placeholder="Nome do exercício (ex: Remada Curvada)"
                value={newPRName}
                onChange={e => setNewPRName(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter') addPR(); if (e.key==='Escape') { setAddingPR(false); setNewPRName('') } }}/>
              <datalist id="exercise-suggestions">
                {EXERCISE_LIBRARY.map(ex => <option key={ex.id} value={ex.name}/>)}
              </datalist>
              <div className="flex gap-2">
                <Button className="flex-1 py-2 text-sm" onClick={addPR}>Adicionar</Button>
                <Button variant="ghost" className="px-4 py-2 text-sm" onClick={() => { setAddingPR(false); setNewPRName('') }}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingPR(true)}
              className="w-full f-card p-3.5 text-sm font-semibold flex items-center justify-center gap-2"
              style={{ color: 'var(--accent)', borderColor: 'rgba(var(--accent-rgb),.25)' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Adicionar exercício
            </button>
          )}
        </div>
      </div>

      {/* ── Histórico ── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
        <button onClick={() => setShowHistory(!showHistory)}
          className="flex items-center justify-between w-full mb-2">
          <p className="f-label">Histórico Recente</p>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24"
            stroke="var(--muted)" strokeWidth="2"
            style={{ transform: showHistory ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s' }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>
        {showHistory && (
          <div className="space-y-2 animate-slide-up">
            {logs.length === 0
              ? <div className="f-card p-6 text-center text-sm" style={{ color: 'var(--text-3)' }}>
                  Nenhum treino realizado ainda.
                </div>
              : <>
                  {logs.slice(0, 5).map((log, i) => (
                    <div key={log.id || i} className="f-card px-4 py-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--surface)' }}>
                        <span className="font-display text-sm" style={{ color: 'var(--accent)' }}>
                          {String(log.date).slice(8)}
                        </span>
                        <span className="text-xs uppercase" style={{ color: 'var(--text-3)' }}>
                          {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][parseInt(String(log.date).slice(5,7))-1]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-1)' }}>{log.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                          {log.exercises?.length} exercícios · {formatDuration(log.duration)}
                        </p>
                      </div>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(var(--accent-rgb),.1)' }}>
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24"
                          stroke="var(--accent)" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => navigate('/app/history')}
                    className="w-full text-center text-sm py-2"
                    style={{ color: 'var(--accent)' }}>
                    Ver histórico completo →
                  </button>
                </>
            }
          </div>
        )}
      </div>

      {/* ── Exportar Dados ── */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
        <p className="f-label mb-2">Exportar meus dados</p>
        <div className="space-y-2">
          {[
            { label: '📋 Ficha de Treino (PDF)', fn: async () => {
              const t = toast.loading('Gerando PDF...')
              const { data } = await routineService.getAll(user.id)
              await exportRoutinePDF({ studentName: profile?.name, routines: data || {} })
              toast.dismiss(t); toast.success('PDF gerado!')
            }},
            { label: '📈 Meu Progresso (PDF)', fn: async () => {
              const t = toast.loading('Gerando relatório...')
              const { data: logs } = await workoutLogService.getAll(user.id)
              const { data: prs }  = await prService.getAll(user.id)
              await exportProgressPDF({ studentName: profile?.name, workoutLogs: logs, prs: prs || {} })
              toast.dismiss(t); toast.success('PDF gerado!')
            }},
          ].map(btn => (
            <button key={btn.label} onClick={btn.fn}
              className="w-full f-card px-4 py-3 flex items-center gap-3 text-left transition-all"
              style={{ color: 'var(--text-1)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='rgba(var(--accent-rgb),.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
              <span className="text-sm font-medium">{btn.label}</span>
              <svg className="ml-auto" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--muted)" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* ── Legal ── */}
      <div className="space-y-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
        <p className="f-label">Legal</p>
        <div className="grid grid-cols-2 gap-2">
          <a href="/privacy" target="_blank"
            className="f-card p-3 text-center text-sm transition-all"
            style={{ color: 'var(--text-3)' }}>
            🔒 Privacidade
          </a>
          <a href="/terms" target="_blank"
            className="f-card p-3 text-center text-sm transition-all"
            style={{ color: 'var(--text-3)' }}>
            📄 Termos de Uso
          </a>
        </div>
      </div>

      {/* ── Sair ── */}
      <div className="space-y-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
        <Button variant="danger" size="xl" onClick={signOut}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Sair da conta
        </Button>

        {!showDelete
          ? <button onClick={() => setShowDelete(true)}
              className="w-full text-center text-xs py-2 transition-colors"
              style={{ color: 'rgba(239,68,68,.35)' }}>
              Excluir minha conta
            </button>
          : <div className="f-card p-4 space-y-3 scale-in"
              style={{ borderColor: 'rgba(239,68,68,.3)', background: 'rgba(239,68,68,.04)' }}>
              <p className="text-sm font-semibold text-center" style={{ color: '#f87171' }}>
                ⚠️ Isso excluirá todos os seus dados permanentemente.
              </p>
              <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
                Treinos, histórico, fotos de progresso e conquistas — tudo é apagado
                e não pode ser recuperado.
                {isPersonal && ' Seus alunos perdem o vínculo com você, mas as contas deles continuam intactas.'}
              </p>
              {deleteError && (
                <p className="text-xs text-center" style={{ color: '#f87171' }}>{deleteError}</p>
              )}
              <Button variant="danger" size="lg" className="w-full"
                onClick={handleDeleteAccount} loading={deleting}>
                Sim, excluir minha conta
              </Button>
              <button onClick={() => { setShowDelete(false); setDeleteError('') }} disabled={deleting}
                className="w-full text-center text-sm" style={{ color: 'var(--text-3)' }}>
                Cancelar
              </button>
            </div>
        }
      </div>

      <p className="text-center text-xs font-body tracking-widest"
        style={{ color: 'rgba(var(--accent-rgb),.2)' }}>
        VORYN v2.0
      </p>
    </div>
  )
}
