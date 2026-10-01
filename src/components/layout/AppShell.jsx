import React, { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import HomeView              from '@/views/HomeView'
import RoutineView           from '@/views/RoutineView'
import WorkoutView           from '@/views/WorkoutView'
import PersonalView          from '@/views/PersonalView'
import ProfileView           from '@/views/ProfileView'
import PersonalDashboardView from '@/views/PersonalDashboardView'
import SubscriptionView      from '@/views/SubscriptionView'
import EvolutionView         from '@/views/EvolutionView'
import HistoryView           from '@/views/HistoryView'
import GoalsView             from '@/views/GoalsView'
import AchievementsView      from '@/views/AchievementsView'
import ProgressPhotosView    from '@/views/ProgressPhotosView'
import CommunityView         from '@/views/CommunityView'
import OnboardingView        from '@/views/OnboardingView'
import PaywallGate           from '@/components/PaywallGate'
import EmailConfirmGate      from '@/components/EmailConfirmGate'
import NotificationPrompt    from '@/components/ui/NotificationPrompt'
import TrialEndingBanner     from '@/components/ui/TrialEndingBanner'
import { pushService }       from '@/services/pushNotifications'
import { activeWorkoutService, offlineSyncService, syncPendingWorkouts } from '@/services'

// Barra de baixo do aluno: Início, Histórico, Treinar (botão central em
// destaque), Evolução e Perfil. As demais telas (Rotina, Metas, Conquistas,
// Progresso, Comunidade, Personal) ficam no menu "Mais" do cabeçalho
// (MORE_EXTRAS) e nos atalhos da Home — nenhuma deixou de existir.
const STUDENT_NAV = [
  { path: '',          label: 'Início',    icon: 'home' },
  { path: 'history',   label: 'Histórico', icon: 'history' },
  { path: 'workout',   label: 'Treinar',   icon: 'workout', raised: true },
  { path: 'evolution', label: 'Evolução',  icon: 'evolution' },
  { path: 'profile',   label: 'Perfil',    icon: 'profile' },
]

const PERSONAL_NAV = [
  { path: '',        label: 'Alunos',  icon: 'students' },
  { path: 'routine', label: 'Rotinas', icon: 'routine' },
  { path: 'workout', label: 'Treinar', icon: 'workout' },
  { path: 'profile', label: 'Perfil',  icon: 'profile' },
]

const MORE_EXTRAS = [
  { path: 'routine',      icon: 'routine',      label: 'Rotina'    },
  { path: 'goals',        icon: 'goals',        label: 'Metas'     },
  { path: 'achievements', icon: 'achievements', label: 'Conquistas'},
  { path: 'photos',       icon: 'photos',       label: 'Progresso' },
  { path: 'community',    icon: 'community',    label: 'Comunidade'},
  { path: 'personal',     icon: 'personal',     label: 'Personal'  },
]

function NavIcon({ type, active }) {
  const w = active ? 2.5 : 1.8
  const icons = {
    home:     <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={w}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    routine:  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={w}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>,
    workout:  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={w} strokeLinecap="round"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>,
    history:  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>,
    evolution: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></svg>,
    more:     <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={w}><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>,
    profile:  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={w}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    students: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={w}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  }
  return icons[type] || null
}

function MoreIcon({ type }) {
  const paths = {
    routine: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></>,
    evolution: <><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></>,
    history: <><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h6M8 17h4"/></>,
    goals: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M22 12h-3"/></>,
    achievements: <><path d="M8 4h8v5a4 4 0 01-8 0V4z"/><path d="M8 6H5v2a3 3 0 003 3M16 6h3v2a3 3 0 01-3 3M12 13v5M8 21h8"/></>,
    photos: <><rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 15-5-5L5 19"/></>,
    community: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20a6 6 0 0112 0M15 20a4 4 0 018 0"/></>,
    personal: <><circle cx="12" cy="8" r="3"/><path d="M5 21a7 7 0 0114 0"/></>,
  }
  return <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">{paths[type]}</svg>
}

function MoreSheet({ open, onClose, navigate, base }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(6px)' }}/>
      <div role="dialog" aria-modal="true" aria-labelledby="more-options-title" className="absolute bottom-0 left-0 right-0 max-w-2xl mx-auto slide-in-bottom glass-panel"
        style={{ borderRadius: '24px 24px 0 0', borderBottom: 'none', padding: '12px 20px 40px' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--border)' }}/>
        <p id="more-options-title" className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-3)' }}>Mais opções</p>
        <div className="grid grid-cols-3 gap-3">
          {MORE_EXTRAS.map(e => (
            <button key={e.path}
              onClick={() => { navigate(`${base}/${e.path}`); onClose() }}
              className="f-card p-4 flex flex-col items-center gap-2 transition-all"
              style={{ cursor: 'pointer' }}
              onMouseEnter={ev => ev.currentTarget.style.borderColor='var(--accent)'}
              onMouseLeave={ev => ev.currentTarget.style.borderColor='var(--border)'}>
              <span className="f-more-icon"><MoreIcon type={e.icon}/></span>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>{e.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AppShell() {
  const { isPersonal, isAdmin, profile, user, subStatus, isActive: subIsActive, emailConfirmed, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [moreOpen,    setMoreOpen]    = useState(false)
  const [showPushPrompt, setShowPushPrompt] = useState(false)
  // Usado só para decidir a mensagem certa no PaywallGate: se o aluno tem
  // (ou já teve) um vínculo de personal registrado, o motivo do bloqueio é
  // diferente de "nunca assinou nada" — é "o acesso via personal não vale
  // mais". Consulta leve, sem afetar o cálculo real de isActive (que já
  // vem corretamente combinado do AuthContext).
  const [hadTrainerLink, setHadTrainerLink] = useState(false)
  // Sessão de treino ativa: escala full-screen imersiva (sem header/dock
  // padrão) — o próprio WorkoutView desenha seu topo (voltar/timer/menu).
  // AppShell e WorkoutView são irmãos (sem contexto entre eles), então só
  // ler activeWorkoutService.get() no render não bastava: nada disparava
  // um novo render aqui quando o treino começava/terminava. Reaproveita o
  // mesmo padrão de CustomEvent que este arquivo já usa (voryn:payment_success).
  // Precisa ficar ANTES do "return <PaywallGate/>" logo abaixo — hooks não
  // podem ser chamados depois de um return condicional (Rules of Hooks).
  const [workoutActive, setWorkoutActive] = useState(() => !!activeWorkoutService.get())
  const [pendingSync, setPendingSync] = useState(() => offlineSyncService.count(user?.id))
  useEffect(() => {
    const h = () => setWorkoutActive(!!activeWorkoutService.get())
    window.addEventListener('voryn:workout_active_change', h)
    return () => window.removeEventListener('voryn:workout_active_change', h)
  }, [])
  useEffect(() => {
    const refresh = () => setPendingSync(offlineSyncService.count(user?.id))
    const sync = () => { syncPendingWorkouts(user?.id).then(refresh) }
    window.addEventListener('voryn:sync_queue_change', refresh)
    window.addEventListener('online', sync)
    if (navigator.onLine) sync()
    return () => {
      window.removeEventListener('voryn:sync_queue_change', refresh)
      window.removeEventListener('online', sync)
    }
  }, [user?.id])
  const base = '/app'

  useEffect(() => {
    if (!user || isPersonal || isAdmin) return
    supabase.from('trainer_students').select('id').eq('student_id', user.id).limit(1)
      .then(({ data }) => setHadTrainerLink(Boolean(data?.length)))
      .catch(() => {})
  }, [user, isPersonal, isAdmin])

  // Listen for payment success event (dispatched from HomeView after MP redirect)
  useEffect(() => {
    function onPaymentSuccess() {
      // Refresh profile to get new subscription status
      window.location.reload()
    }
    window.addEventListener('voryn:payment_success', onPaymentSuccess)
    return () => window.removeEventListener('voryn:payment_success', onPaymentSuccess)
  }, [])

  // Show push notification prompt after 30s on first visit (only if supported & default)
  useEffect(() => {
    if (!user || !pushService.isSupported()) return
    if (Notification.permission !== 'default') return
    const key = `voryn_push_asked_${user.id}`
    if (localStorage.getItem(key)) return
    const t = setTimeout(() => {
      setShowPushPrompt(true)
      localStorage.setItem(key, '1')
    }, 30000)
    return () => clearTimeout(t)
  }, [user])

  // Confirmação de email: bloqueia tudo (inclusive onboarding) até o
  // usuário clicar no link enviado no cadastro. Precisa vir ANTES do
  // check de onboarding_done — não faz sentido mandar alguém escolher
  // objetivo de treino antes de sequer confirmar que o email é real.
  // Admin nunca é bloqueado (contas de admin são criadas manualmente,
  // não passam pelo fluxo de signup público).
  if (profile && !isAdmin && !emailConfirmed) {
    return <EmailConfirmGate onSignOut={signOut} />
  }

  if (profile && profile.onboarding_done === false) {
    return <OnboardingView />
  }

  // Paywall: bloqueia o app se a assinatura não está ativa nem em trial.
  // Admin nunca é bloqueado. A própria tela de assinatura (/app/subscription)
  // continua acessível para que o usuário consiga de fato assinar/regularizar
  // o pagamento — só o resto do app fica indisponível.
  const onSubscriptionPage = location.pathname.startsWith(`${base}/subscription`)
  if (profile && !isAdmin && !subIsActive && !onSubscriptionPage) {
    return <PaywallGate status={subStatus} hadTrainerAccess={hadTrainerLink} onSignOut={signOut} />
  }

  const navItems = isPersonal ? PERSONAL_NAV : STUDENT_NAV

  function isActive(path) {
    if (path === '') return location.pathname === base || location.pathname === `${base}/`
    return location.pathname.startsWith(`${base}/${path}`)
  }

  // Alguma tela do menu "Mais" está aberta? (deixa o botão do menu em destaque)
  const onMoreScreen = MORE_EXTRAS.some(e => location.pathname.includes(`${base}/${e.path}`))

  function handleNav(path) {
    navigate(path === '' ? base : `${base}/${path}`)
  }

  const screenLabels = {
    routine: 'Rotina de treino', workout: 'Sessão ativa', profile: 'Seu perfil',
    evolution: 'Evolução', history: 'Histórico', goals: 'Metas',
    achievements: 'Conquistas', photos: 'Progresso', community: 'Comunidade',
    personal: 'Seu personal', subscription: 'Assinatura',
  }
  const inActiveWorkout = location.pathname.includes(`${base}/workout`) && workoutActive
  const currentKey = Object.keys(screenLabels).find(key => location.pathname.includes(`${base}/${key}`))
  const screenLabel = currentKey ? screenLabels[currentKey] : (isPersonal ? 'Painel de alunos' : 'Visão geral')
  const displayName = profile?.name?.split(' ')[0] || (isPersonal ? 'Personal' : 'Atleta')

  return (
    <div className="app-shell h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} navigate={navigate} base={base}/>

      {/* Push prompt */}
      {showPushPrompt && (
        <div className="fixed top-4 left-0 right-0 z-40 max-w-2xl mx-auto px-0">
          <NotificationPrompt onDismiss={() => setShowPushPrompt(false)} />
        </div>
      )}

      <header className="app-header px-4 pt-4 pb-3 native-header" style={inActiveWorkout ? { display: 'none' } : undefined}>
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <button onClick={() => navigate(base)} className="brand-hub flex items-center gap-2.5 bg-transparent border-0 p-0 cursor-pointer" aria-label="Ir para início">
            <img src="/voryn-icon-192.png" alt="Voryn" className="w-9 h-9 rounded-xl" style={{ boxShadow: '0 0 18px rgba(var(--accent-rgb),.3)' }} />
            <div className="text-left">
              <div className="font-display text-xl uppercase tracking-widest leading-none">Voryn</div>
              <div className="app-header-context text-[10px] uppercase tracking-[.18em] mt-1" style={{ color: 'var(--text-3)' }}>{screenLabel}</div>
            </div>
          </button>
          <div className="flex items-center gap-2.5">
            <span className="app-status-pill hidden sm:inline-flex">
              <span />
              Em movimento
            </span>
            <span className="hidden sm:block text-xs text-right" style={{ color: 'var(--text-3)' }}>
              Olá, <strong style={{ color: 'var(--text-2)' }}>{displayName}</strong>
            </span>
            {!isPersonal && (
              <button onClick={() => setMoreOpen(true)} aria-label="Mais opções"
                className="w-10 h-10 rounded-full flex items-center justify-center border cursor-pointer"
                style={{
                  background: onMoreScreen ? 'rgba(var(--accent-rgb),.16)' : 'transparent',
                  color: onMoreScreen ? 'var(--accent-2)' : 'var(--text-2)',
                  borderColor: onMoreScreen ? 'rgba(var(--accent-rgb),.35)' : 'var(--border)',
                }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
                </svg>
              </button>
            )}
            <button onClick={() => navigate(`${base}/profile`)} className="profile-chip w-10 h-10 rounded-full flex items-center justify-center border cursor-pointer font-display text-lg" style={{ background: 'rgba(var(--accent-rgb),.16)', color: 'var(--accent-2)', borderColor: 'rgba(var(--accent-rgb),.35)' }} aria-label="Abrir perfil">
              {displayName.charAt(0).toUpperCase()}
            </button>
            <span className="w-2 h-2 rounded-full" title="Status online" style={{ background: 'var(--success)', boxShadow: '0 0 10px rgba(61,220,151,.7)' }} />
            {pendingSync > 0 && (
              <span className="app-sync-pill" title={`${pendingSync} treino(s) aguardando sincronização`}>
                {pendingSync} pendente{pendingSync > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-2xl mx-auto">
          <TrialEndingBanner hidden={onSubscriptionPage} />
          <Routes>
            <Route index              element={isPersonal ? <PersonalDashboardView /> : <HomeView />} />
            <Route path="routine/*"      element={<RoutineView />} />
            <Route path="workout/*"      element={<WorkoutView />} />
            <Route path="personal/*"     element={<PersonalView />} />
            <Route path="profile/*"      element={<ProfileView />} />
            <Route path="subscription"   element={<SubscriptionView />} />
            <Route path="evolution/*"    element={<EvolutionView />} />
            <Route path="history/*"      element={<HistoryView />} />
            <Route path="goals/*"        element={<GoalsView />} />
            <Route path="achievements/*" element={<AchievementsView />} />
            <Route path="photos/*"        element={<ProgressPhotosView />} />
            <Route path="community/*"     element={<CommunityView />} />
            <Route path="onboarding"     element={<OnboardingView />} />
          </Routes>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav aria-label="Navegação principal" className="px-3 pb-3" style={{ background: 'transparent', flexShrink: 0, display: inActiveWorkout ? 'none' : undefined }}>
        <div className="glass-panel native-dock flex items-center justify-around px-2 pt-2 max-w-2xl mx-auto shadow-2xl" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))', borderColor: 'rgba(255,255,255,.12)' }}>
          {navItems.map(item => {
            const active = isActive(item.path)
            // Botão central "Treinar": círculo elevado em cor de destaque,
            // é a ação principal do app.
            if (item.raised) {
              return (
                <button key={item.path} onClick={() => handleNav(item.path)}
                  className="flex flex-col items-center gap-1 px-2 active:scale-95 transition-transform min-w-[58px]"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}>
                  <span className="flex items-center justify-center rounded-full"
                    style={{
                      width: 50, height: 50, marginTop: -22, background: 'var(--accent)', color: '#fff',
                      border: '4px solid var(--bg)',
                      boxShadow: active ? '0 0 0 2px rgba(var(--accent-rgb),.5)' : 'none',
                    }}>
                    <NavIcon type={item.icon} active={true}/>
                  </span>
                  <span className="font-display uppercase tracking-wider"
                    style={{ fontSize: 11, fontWeight: 800, color: active ? 'var(--accent-2)' : 'var(--muted)' }}>{item.label}</span>
                </button>
              )
            }
            return (
              <button key={item.path} onClick={() => handleNav(item.path)}
                className="dock-item flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all relative active:scale-95 min-w-[58px]"
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                style={{ color: active ? 'var(--accent-2)' : 'var(--muted)', border: 'none', background: active ? 'rgba(var(--accent-rgb),.1)' : 'transparent', cursor: 'pointer' }}>
                {active && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-7 h-1 rounded-full"
                    style={{ background: 'var(--accent)', boxShadow: '0 0 10px rgba(var(--accent-rgb),.7)' }}/>
                )}
                <div style={{ transform: active ? 'scale(1.12)' : 'scale(1)', transition: 'transform .15s' }}>
                  <NavIcon type={item.icon} active={active}/>
                </div>
                <span className={item.path === 'workout' ? 'font-display uppercase tracking-wider' : ''} style={{ fontSize: item.path === 'workout' ? 12 : 10, fontWeight: active ? 800 : 500 }}>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
