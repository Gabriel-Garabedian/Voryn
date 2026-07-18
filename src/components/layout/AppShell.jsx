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

const STUDENT_NAV = [
  { path: '',        label: 'Home',    icon: 'home' },
  { path: 'routine', label: 'Rotina',  icon: 'routine' },
  { path: 'workout', label: 'Treinar', icon: 'workout' },
  { path: 'more',    label: 'Mais',    icon: 'more' },
  { path: 'profile', label: 'Perfil',  icon: 'profile' },
]

const PERSONAL_NAV = [
  { path: '',        label: 'Alunos',  icon: 'students' },
  { path: 'routine', label: 'Rotinas', icon: 'routine' },
  { path: 'workout', label: 'Treinar', icon: 'workout' },
  { path: 'profile', label: 'Perfil',  icon: 'profile' },
]

const MORE_EXTRAS = [
  { path: 'evolution',    icon: '📈', label: 'Evolução'  },
  { path: 'history',      icon: '📋', label: 'Histórico' },
  { path: 'goals',        icon: '🎯', label: 'Metas'     },
  { path: 'achievements', icon: '🏆', label: 'Conquistas'},
  { path: 'photos',       icon: '📸', label: 'Progresso' },
  { path: 'community',    icon: '👥', label: 'Comunidade'},
  { path: 'personal',     icon: '👤', label: 'Personal'  },
]

function NavIcon({ type, active }) {
  const w = active ? 2.5 : 1.8
  const icons = {
    home:     <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={w}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    routine:  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={w}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/></svg>,
    workout:  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={w}><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>,
    more:     <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={w}><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>,
    profile:  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={w}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    students: <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={w}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  }
  return icons[type] || null
}

function MoreSheet({ open, onClose, navigate, base }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(6px)' }}/>
      <div className="absolute bottom-0 left-0 right-0 max-w-2xl mx-auto slide-in-bottom"
        style={{ background: 'var(--surface)', borderRadius: '24px 24px 0 0', border: '1px solid var(--border)', borderBottom: 'none', padding: '12px 20px 40px' }}
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--border)' }}/>
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-3)' }}>Mais opções</p>
        <div className="grid grid-cols-3 gap-3">
          {MORE_EXTRAS.map(e => (
            <button key={e.path}
              onClick={() => { navigate(`${base}/${e.path}`); onClose() }}
              className="f-card p-4 flex flex-col items-center gap-2 transition-all"
              style={{ cursor: 'pointer' }}
              onMouseEnter={ev => ev.currentTarget.style.borderColor='var(--accent)'}
              onMouseLeave={ev => ev.currentTarget.style.borderColor='var(--border)'}>
              <span className="text-2xl">{e.icon}</span>
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
    if (path === 'more') return MORE_EXTRAS.some(e => location.pathname.includes(`${base}/${e.path}`))
    return location.pathname.startsWith(`${base}/${path}`)
  }

  function handleNav(path) {
    if (path === 'more') { setMoreOpen(true); return }
    navigate(path === '' ? base : `${base}/${path}`)
  }

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} navigate={navigate} base={base}/>

      {/* Push prompt */}
      {showPushPrompt && (
        <div className="fixed top-4 left-0 right-0 z-40 max-w-2xl mx-auto px-0">
          <NotificationPrompt onDismiss={() => setShowPushPrompt(false)} />
        </div>
      )}

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
      <nav style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div className="flex items-center justify-around px-2 pt-2 pb-3 max-w-2xl mx-auto" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          {navItems.map(item => {
            const active = isActive(item.path)
            return (
              <button key={item.path} onClick={() => handleNav(item.path)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all relative"
                style={{ color: active ? 'var(--accent)' : 'var(--muted)', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                {active && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                    style={{ background: 'var(--accent)', boxShadow: '0 0 6px rgba(var(--accent-rgb),.6)' }}/>
                )}
                <div style={{ transform: active ? 'scale(1.1)' : 'scale(1)', transition: 'transform .15s' }}>
                  <NavIcon type={item.icon} active={active}/>
                </div>
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
