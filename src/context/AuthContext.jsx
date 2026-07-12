import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getSubscription } from '@/utils/helpers'

const AuthContext = createContext(null)

// Verifica se a assinatura do usuário venceu (trial expirado, ou período pago
// encerrado após cancelamento) e, se sim, atualiza o status no banco e no
// objeto local antes de exibir o perfil. Sem isso, 'trialing' e 'active'
// nunca mudavam de status sozinhos — o acesso continuava liberado para
// sempre, mesmo com a data de expiração no passado.
async function expireSubscriptionIfNeeded(profileData) {
  const sub = getSubscription(profileData)
  if (!sub) return

  const now = new Date()
  let shouldExpire = false

  if (sub.status === 'trialing' && sub.trial_ends_at && new Date(sub.trial_ends_at) < now) {
    shouldExpire = true
  }
  if (sub.status === 'active' && sub.cancel_at_period_end && sub.current_period_end && new Date(sub.current_period_end) < now) {
    shouldExpire = true
  }

  if (!shouldExpire) return

  try {
    await supabase.from('subscriptions').update({
      status:     'canceled',
      updated_at: now.toISOString(),
    }).eq('id', sub.id)
    sub.status = 'canceled' // reflete na mesma renderização, sem esperar um novo fetch
  } catch (e) {
    console.warn('[Voryn] Falha ao expirar assinatura vencida (não crítico):', e)
  }
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [theme,   setTheme]   = useState(() => localStorage.getItem('voryn_theme') || 'dark')
  // Cor de destaque alternativa ao roxo (recurso pago — ver isPayingUser
  // abaixo). Guardamos a preferência mesmo de quem não é pagante ainda,
  // para já aplicar automaticamente se a pessoa assinar depois, mas a
  // aplicação real no DOM (useEffect mais abaixo) sempre confere a regra
  // de negócio, não confia só no localStorage.
  const [accentColor, setAccentColorState] = useState(() => localStorage.getItem('voryn_accent') || 'purple')
  // Mudança de modelo de negócio: aluno vinculado a um personal com
  // assinatura ativa/trial tem acesso liberado, sem precisar pagar a
  // própria mensalidade. Calculado via RPC (student_has_trainer_access),
  // já que a RLS de subscriptions não permite o aluno ler a assinatura de
  // terceiros diretamente — nem deveria.
  const [hasTrainerAccess, setHasTrainerAccess] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light')
    localStorage.setItem('voryn_theme', theme)
  }, [theme])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setHasTrainerAccess(false); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, subscriptions(*)')
        .eq('id', userId)
        .single()
      if (!error && data) {
        await expireSubscriptionIfNeeded(data)
        setProfile(data)
      } else {
        const { data: basic } = await supabase.from('users').select('*').eq('id', userId).single()
        if (basic) setProfile(basic)
      }

      // Checa se o acesso está liberado pelo plano do personal vinculado
      // (independente da própria assinatura). Best-effort: se a RPC falhar
      // por qualquer motivo, mantém o valor anterior (false por padrão) em
      // vez de travar o carregamento do perfil por causa disso.
      try {
        const { data: trainerAccess } = await supabase.rpc('student_has_trainer_access', { p_student_id: userId })
        setHasTrainerAccess(Boolean(trainerAccess))
      } catch (e) {
        console.warn('[Voryn] Falha ao checar acesso via personal (não crítico):', e)
      }
      // Retry de vínculo pendente com personal (caso registro tenha falhado)
      const pendingTrainerId = localStorage.getItem('voryn_pending_trainer')
      if (pendingTrainerId) {
        try {
          // RPC em vez de select direto — ver comentário equivalente em
          // RegisterPage.jsx sobre a remoção da policy pública em trainers.
          const { data: trainerId } = await supabase
            .rpc('get_trainer_id_by_user', { p_user_id: pendingTrainerId })
          if (trainerId) {
            const { error: linkErr } = await supabase
              .from('trainer_students')
              .upsert(
                { trainer_id: trainerId, student_id: userId, status: 'active' },
                { onConflict: 'trainer_id,student_id', ignoreDuplicates: true }
              )
            if (!linkErr) {
              localStorage.removeItem('voryn_pending_trainer')
              console.log('[Voryn] Vínculo pendente processado com sucesso')
            } else if (String(linkErr.message || '').includes('limite de alunos')) {
              // Erro permanente (limite do plano do personal) — sem isso, o
              // app tentava de novo a cada login, para sempre, sem nunca
              // avisar ninguém do motivo real da falha.
              localStorage.removeItem('voryn_pending_trainer')
              console.warn('[Voryn] Vínculo pendente cancelado: personal atingiu o limite de alunos do plano')
            }
            // outros erros: mantém no localStorage, é transitório (rede, RLS, etc.)
          }
        } catch (e) {
          console.warn('[Voryn] Retry vínculo falhou (não crítico):', e)
        }
      }

    } catch (e) {
      console.error('fetchProfile:', e)
    } finally {
      setLoading(false)
    }
  }

  async function signUp({ email, password, name, role = 'student' }) {
    const result = await supabase.auth.signUp({ email, password, options: { data: { name, role } } })

    // Dispara email de boas-vindas (best-effort, nunca bloqueia o cadastro).
    // Usamos o access_token da sessão recém-criada (não a anonKey pública) para
    // que a Edge Function valide quem está chamando antes de enviar o email —
    // sem isso, qualquer pessoa poderia usar essa rota pra mandar email pra
    // qualquer endereço, sem nenhuma autenticação.
    if (!result.error && result.data?.user) {
      const supaUrl     = import.meta.env.VITE_SUPABASE_URL
      const accessToken = result.data?.session?.access_token
      if (accessToken) {
        fetch(`${supaUrl}/functions/v1/welcome-email`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
          body:    JSON.stringify({ name: name || email.split('@')[0], role }),
        }).catch(() => {})
      }
    }

    return result
  }
  async function signIn({ email, password }) {
    return supabase.auth.signInWithPassword({ email, password })
  }
  // Reenvia o email de confirmação nativo do Supabase Auth (não é o
  // welcome-email, que é conteúdo próprio disparado à parte). Necessário
  // porque, com "Confirm email" habilitado, signUp() não retorna sessão —
  // então welcomeEmail (que exige JWT) não dispara nesse momento, e o
  // único email que o usuário recebe de fato é este de confirmação nativo.
  // Existir um jeito de reenviar evita que alguém fique travado para
  // sempre por um email que caiu no spam ou nunca chegou.
  async function resendConfirmation(email) {
    return supabase.auth.resend({ type: 'signup', email })
  }
  // Autoexclusão de conta — antes disso, a única forma de excluir a
  // própria conta era mandar um email para o suporte pedir manualmente.
  // Chama a mesma Edge Function delete-user usada pelo admin, mas com a
  // flag selfDelete: true, que dispara um caminho de autorização diferente
  // (não exige ser admin, só que o alvo seja o próprio usuário logado —
  // ver comentário em delete-user/index.ts). Faz o mesmo trabalho completo:
  // remove arquivos do Storage, dados do banco e a conta de autenticação.
  async function deleteAccount() {
    const supaUrl = import.meta.env.VITE_SUPABASE_URL
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token
    if (!accessToken) return { error: { message: 'Sessão expirada. Faça login novamente.' } }

    try {
      const res = await fetch(`${supaUrl}/functions/v1/delete-user`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body:    JSON.stringify({ selfDelete: true }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { error: { message: data?.error || 'Falha ao excluir conta' } }

      // A conta já foi excluída no servidor nesse ponto — o que segue é só
      // limpeza local. Isolado em try/catch próprio de propósito: signOut()
      // chama o servidor para invalidar o refresh token de um usuário que
      // já não existe mais em auth.users, o que pode falhar de formas
      // imprevisíveis. Se isso caísse no catch externo, uma exclusão que
      // JÁ teve sucesso (res.ok true) seria reportada como erro para quem
      // chamou — a pessoa veria "falha ao excluir conta" para uma conta
      // que, na prática, já não existe mais.
      try { await supabase.auth.signOut() } catch { /* já não importa mais */ }
      setUser(null); setProfile(null); setHasTrainerAccess(false)
      return { data, error: null }
    } catch (e) {
      return { error: { message: e?.message || 'Falha ao excluir conta' } }
    }
  }
  async function signOut() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setHasTrainerAccess(false)
  }
  async function resetPassword(email) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
  }
  async function updatePassword(newPassword) {
    return supabase.auth.updateUser({ password: newPassword })
  }
  async function updateProfile(updates) {
    const { data, error } = await supabase
      .from('users').update(updates).eq('id', user.id).select().single()
    if (!error && data) setProfile(p => ({ ...p, ...data }))
    return { data, error }
  }

  const role       = profile?.role || 'student'
  // Reflete se o email foi confirmado (clicou no link enviado no cadastro).
  // Necessário porque, desde a correção do trigger handle_new_user, o
  // trial só inicia após a confirmação — antes disso, subStatus fica
  // 'inactive' mesmo que o usuário seja legítimo e só ainda não tenha
  // clicado no link. Sem distinguir esse caso, PaywallGate mostraria
  // "assine um plano" para alguém que só precisa checar o email.
  const emailConfirmed = Boolean(user?.email_confirmed_at)
  // getSubscription() em vez de subscriptions?.[0] direto — ver comentário
  // na função em utils/helpers.js. Esse acesso direto era a causa raiz do
  // bug onde a assinatura "sumia" mesmo com o dado certo no banco: desde
  // que subscriptions.user_id ganhou um "unique" (correção anterior, para
  // o upsert do Mercado Pago), o Supabase passou a devolver subscriptions
  // como OBJETO, não lista — e [0] num objeto sempre é undefined.
  const subRow    = getSubscription(profile)
  const plan       = subRow?.plan || 'free'
  const subStatus  = subRow?.status || 'inactive'
  const trialEndsAt = subRow?.trial_ends_at || null
  // Usado pelo banner de "trial acabando" no AppShell. null quando não
  // está em trial ou não há data — o banner decide se mostra a partir
  // disso, junto com subStatus === 'trialing'.
  const daysUntilTrialEnd = trialEndsAt
    ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000)
    : null
  // isActive agora considera DUAS fontes: a própria assinatura OU o
  // vínculo com um personal que está pagando. Antes, só a própria
  // assinatura contava — um aluno cujo acesso deveria ser coberto pelo
  // plano do personal ainda era bloqueado pelo paywall se nunca tivesse
  // pago a própria mensalidade.
  const isActive   = ['active', 'trialing'].includes(subStatus) || hasTrainerAccess
  const isAdmin    = role === 'admin'
  const isPersonal = role === 'personal'
  // Cor de destaque alternativa é recurso pago de verdade — trial NÃO
  // conta, só assinatura ativa (já paga) ou acesso liberado pelo plano do
  // personal (que por sua vez só é true quando o personal está
  // active/trialing — ver student_has_trainer_access no banco).
  const isPayingUser = subStatus === 'active' || hasTrainerAccess

  // Define a cor de destaque e persiste a preferência, mas só aplica de
  // fato no DOM se a regra de negócio permitir — uma pessoa não-pagante
  // nunca vê a cor alternativa, mesmo que o valor já esteja salvo no
  // localStorage de uma assinatura anterior que expirou.
  function setAccentColor(color) {
    localStorage.setItem('voryn_accent', color)
    setAccentColorState(color)
  }

  useEffect(() => {
    const effective = isPayingUser ? accentColor : 'purple'
    if (effective === 'purple') {
      document.documentElement.removeAttribute('data-accent')
    } else {
      document.documentElement.setAttribute('data-accent', effective)
    }
  }, [accentColor, isPayingUser])

  return (
    <AuthContext.Provider value={{
      user, profile, loading, theme, role, plan, subStatus,
      isActive, isAdmin, isPersonal, hasTrainerAccess, emailConfirmed,
      trialEndsAt, daysUntilTrialEnd,
      accentColor, setAccentColor, isPayingUser,
      signUp, signIn, signOut, resetPassword, updatePassword, resendConfirmation,
      deleteAccount,
      updateProfile,
      refreshProfile: () => user?.id ? fetchProfile(user.id) : null,
      toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark'),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
