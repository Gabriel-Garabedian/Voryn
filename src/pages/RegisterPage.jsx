import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { translateError } from '@/utils/helpers'
import { Button } from '@/components/ui'

function VorynLogo() {
  return (
    <div className="flex items-center justify-center gap-3 mb-2">
      <img src="/voryn-icon-192.png" alt="Voryn" className="w-12 h-12 rounded-2xl"
        style={{ boxShadow: '0 0 24px rgba(130,10,209,.5)' }} />
      <span className="font-display text-4xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>Voryn</span>
    </div>
  )
}

// ── Tela de sucesso pós-cadastro com convite ────────────────
function InviteSuccessScreen({ trainerName, onContinue }) {
  const [show, setShow] = useState(false)
  useEffect(() => { setTimeout(() => setShow(true), 80) }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg)' }}>
      {/* glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(130,10,209,.12) 0%,transparent 70%)' }}/>

      <div className="w-full max-w-sm relative z-10 text-center"
        style={{
          opacity:    show ? 1 : 0,
          transform:  show ? 'translateY(0) scale(1)' : 'translateY(20px) scale(.96)',
          transition: 'all .4s cubic-bezier(.34,1.2,.64,1)',
        }}>

        {/* ícone animado */}
        <div className="relative mx-auto mb-6" style={{ width: 96, height: 96 }}>
          {/* pulso externo */}
          <div className="absolute inset-0 rounded-full animate-ping"
            style={{ background: 'rgba(130,10,209,.15)', animationDuration: '1.5s' }}/>
          <div className="w-24 h-24 rounded-full flex items-center justify-center relative"
            style={{ background: 'linear-gradient(135deg,rgba(130,10,209,.25),rgba(130,10,209,.1))', border: '2px solid rgba(130,10,209,.4)' }}>
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="1.8">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/>
              <path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
        </div>

        <h1 className="font-display text-3xl uppercase tracking-wide mb-2"
          style={{ color: 'var(--text-1)' }}>
          Conexão feita!
        </h1>
        <p className="text-base mb-6" style={{ color: 'var(--text-3)', lineHeight: 1.6 }}>
          Você está conectado ao personal
        </p>

        {/* card do personal */}
        <div className="f-card p-5 mb-6 text-left"
          style={{ borderColor: 'rgba(130,10,209,.4)', background: 'rgba(130,10,209,.06)' }}>
          <div className="flex items-center gap-4">
            {/* avatar com iniciais */}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 font-display text-xl"
              style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 0 16px rgba(130,10,209,.4)' }}>
              {trainerName?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="font-display text-xl uppercase tracking-wide" style={{ color: 'var(--accent)' }}>
                {trainerName}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider mt-0.5"
                style={{ color: 'var(--text-3)' }}>
                Personal Trainer
              </p>
            </div>
          </div>

          {/* bullets de confirmação */}
          <div className="mt-4 space-y-2">
            {[
              'Seus treinos serão acompanhados por ele',
              'Você pode trocar mensagens direto no app',
              'Ele acessa seu histórico e evolução',
            ].map((txt, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: 'rgba(74,222,128,.15)', border: '1px solid rgba(74,222,128,.3)' }}>
                  <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="#4ade80" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>{txt}</p>
              </div>
            ))}
          </div>
        </div>

        <Button size="xl" className="w-full" onClick={onContinue}>
          Começar meu onboarding →
        </Button>

        <p className="text-xs mt-4" style={{ color: 'var(--text-3)', opacity: .6 }}>
          Você pode acessar o chat com seu personal a qualquer momento em{' '}
          <span style={{ color: 'var(--accent-2)' }}>Mais → Personal</span>
        </p>
      </div>
    </div>
  )
}

// ── Banner de convite no topo do form ──────────────────────
function InviteBanner({ trainerInfo, loading: loadingInfo }) {
  if (loadingInfo) {
    return (
      <div className="f-card px-4 py-4 mb-4 flex items-center gap-3"
        style={{ borderColor: 'rgba(130,10,209,.25)' }}>
        <div className="w-10 h-10 rounded-xl skeleton-pulse flex-shrink-0"
          style={{ background: 'var(--border)' }}/>
        <div className="flex-1 space-y-2">
          <div className="skeleton-pulse h-3.5 w-32 rounded" style={{ background: 'var(--border)' }}/>
          <div className="skeleton-pulse h-3 w-48 rounded" style={{ background: 'var(--border)' }}/>
        </div>
      </div>
    )
  }

  return (
    <div className="f-card px-4 py-4 mb-4 animate-slide-up"
      style={{ borderColor: 'rgba(130,10,209,.4)', background: 'rgba(130,10,209,.05)' }}>

      {/* cabeçalho */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(130,10,209,.2)' }}>
          <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth="2.5">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .27h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/>
          </svg>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>
          Convite de Personal Trainer
        </p>
      </div>

      {/* personal info */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-display text-lg"
          style={{ background: 'var(--accent)', color: '#fff', boxShadow: '0 0 12px rgba(130,10,209,.35)' }}>
          {trainerInfo?.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
            {trainerInfo?.name || 'Personal Trainer'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Personal Trainer · Voryn</p>
        </div>
      </div>

      {/* mensagem de convite */}
      <div className="rounded-xl px-3 py-2.5"
        style={{ background: 'rgba(130,10,209,.08)', border: '1px solid rgba(130,10,209,.15)' }}>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
          <strong style={{ color: 'var(--text-1)' }}>
            {trainerInfo?.name?.split(' ')[0] || 'Seu personal'}
          </strong>{' '}
          te convidou para acompanhar seus treinos pelo Voryn.
          Ao criar sua conta, você será conectado automaticamente ao painel dele.
        </p>
      </div>

      {/* check items */}
      <div className="mt-3 space-y-1.5">
        {[
          'Seus treinos serão acompanhados por ele',
          'Chat direto dentro do app',
          'Evolução e histórico compartilhados',
        ].map((txt, i) => (
          <div key={i} className="flex items-center gap-2">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#4ade80" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>{txt}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Página principal ────────────────────────────────────────
export default function RegisterPage() {
  const { signUp }  = useAuth()
  const navigate    = useNavigate()
  const [params]    = useSearchParams()

  const trainerParam   = params.get('trainer')
  // BUG CRÍTICO confirmado em teste real: não existe rota "/onboarding" no
  // nível raiz — só "/app/onboarding" (dentro do AppShell, em /app/*). Todo
  // cadastro caía direto no catch-all "*" => NotFoundPage (404), sempre,
  // independente de qualquer configuração de Vercel/Mercado Pago.
  const redirectTo     = params.get('redirect') || '/app/onboarding'
  const hasInvite      = Boolean(trainerParam)

  const [form,         setForm]         = useState({ name: '', email: '', password: '', role: 'student' })
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [trainerInfo,  setTrainerInfo]  = useState(null)
  const [loadingInfo,  setLoadingInfo]  = useState(hasInvite)
  const [linkSuccess,  setLinkSuccess]  = useState(false) // Melhoria 2: tela de sucesso
  const [agreed,       setAgreed]       = useState(false)

  // Carregar dados do personal que enviou o convite.
  // ANTES, isso fazia supabase.from('users').select(...).eq('id', trainerParam)
  // direto — mas a policy de RLS de 'users' exige auth.uid() = id, que
  // NUNCA é verdade para um visitante deslogado (que é exatamente quem
  // está nesta tela, antes de criar conta). Isso significava: trainerInfo
  // ficava sempre null, a tela mostrava "Personal Trainer" genérico, e o
  // bloco de auto-vínculo no handleSubmit (que dependia de
  // "trainerParam && trainerInfo") nunca executava — o aluno cadastrava a
  // conta e nunca era vinculado a ninguém, sem nenhum aviso. Corrigido
  // usando a função get_trainer_public_name (RPC), criada especificamente
  // para ser consultável por usuários deslogados.
  useEffect(() => {
    if (!trainerParam) return
    supabase
      .rpc('get_trainer_public_name', { p_user_id: trainerParam })
      .then(({ data: name }) => {
        if (name) setTrainerInfo({ id: trainerParam, name })
        setLoadingInfo(false)
      })
  }, [trainerParam])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      setError('Preencha todos os campos. Senha mínima de 6 caracteres.')
      return
    }
    if (!agreed) {
      setError('Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.')
      return
    }
    setLoading(true)
    setError('')

    const { error: signUpErr } = await signUp({
      email:    form.email.trim(),
      password: form.password,
      name:     form.name.trim(),
      role:     form.role,
    })

    if (signUpErr) { setError(translateError(signUpErr)); setLoading(false); return }

    // Salva a intenção de vínculo IMEDIATAMENTE, sempre que houver
    // trainerParam — independente de trainerInfo já ter carregado ou não.
    // ANTES, isso só acontecia dentro de "if (trainerParam && trainerInfo)",
    // e como trainerInfo podia ficar null (rede lenta, ou o bug de RLS
    // acima antes de ser corrigido), o cadastro inteiro perdia a única
    // rede de segurança que existia para tentar o vínculo depois.
    if (trainerParam) {
      localStorage.setItem('voryn_pending_trainer', trainerParam)
    }

    // Auto-link imediato (melhor experiência: mostra a tela de sucesso na
    // hora, em vez de só confiar no retry posterior do AuthContext).
    if (trainerParam && trainerInfo) {
      try {
        let session = null
        for (let i = 0; i < 10; i++) {
          const { data } = await supabase.auth.getSession()
          if (data?.session?.user) { session = data.session; break }
          await new Promise(r => setTimeout(r, 500))
        }

        if (session?.user) {
          // Usa a RPC get_trainer_id_by_user em vez de select direto na
          // tabela trainers — não existe mais policy pública que permita
          // ler a linha (removida por expor phone/instagram publicamente,
          // ver schema.sql). A RPC devolve só o id, o suficiente para
          // criar o vínculo abaixo.
          const { data: trainerId } = await supabase
            .rpc('get_trainer_id_by_user', { p_user_id: trainerInfo.id })

          if (trainerId) {
            const { error: linkErr } = await supabase
              .from('trainer_students')
              .upsert(
                { trainer_id: trainerId, student_id: session.user.id, status: 'active' },
                { onConflict: 'trainer_id,student_id', ignoreDuplicates: true }
              )
            if (!linkErr) {
              localStorage.removeItem('voryn_pending_trainer')
              setLoading(false)
              setLinkSuccess(true) // ← Melhoria 2: mostrar tela de sucesso
              return
            }
            // Limite de alunos do plano do personal atingido (vem da trigger
            // enforce_trainer_student_limit no banco) — isso é um erro
            // PERMANENTE, não transitório. Antes, ficava preso no
            // localStorage e o AuthContext tentava de novo a cada login,
            // sempre falhando, sem avisar nem o aluno nem o personal.
            // Agora avisamos o aluno e paramos de tentar.
            if (String(linkErr.message || '').includes('limite de alunos')) {
              localStorage.removeItem('voryn_pending_trainer')
              setLoading(false)
              setError(`${trainerInfo?.name || 'Seu personal'} atingiu o limite de alunos do plano atual. Avise-o para fazer upgrade, ou continue usando o Voryn sem vínculo por enquanto — sua conta foi criada normalmente.`)
              navigate(redirectTo)
              return
            }
            // outros erros (rede, RLS, etc.): mantemos o item no localStorage
            // para o AuthContext tentar de novo depois — esse caso é transitório.
          }
          // trainer não encontrado ainda: mantemos o item no localStorage (já foi salvo acima)
        }
        // session nunca apareceu dentro do tempo limite: mantemos o item no localStorage
        // (já foi salvo acima) — o AuthContext vai processar isso no próximo fetchProfile.
      } catch (err) {
        console.warn('[Voryn] Auto-link error (non-critical):', err)
        // Mesmo em erro inesperado, o item já está no localStorage para retry posterior.
      }
    }

    setLoading(false)
    navigate(redirectTo)
  }

  // Melhoria 2 — Tela de confirmação visual pós-cadastro com convite
  if (linkSuccess) {
    return (
      <InviteSuccessScreen
        trainerName={trainerInfo?.name}
        onContinue={() => navigate('/app/onboarding')}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-8"
      style={{ background: 'var(--bg)' }}>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle,rgba(130,10,209,.08) 0%,transparent 70%)' }}/>

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="text-center mb-6">
          <VorynLogo />
        </div>

        {/* Melhoria 1 — Banner visível de quem convidou */}
        {hasInvite && (
          <InviteBanner trainerInfo={trainerInfo} loading={loadingInfo} />
        )}

        <div className="f-card p-6 space-y-4">
          <div className="mb-2">
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
              {hasInvite ? 'Criar sua conta gratuita' : 'Criar conta'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
              14 dias grátis · Sem cartão necessário
            </p>
          </div>

          {error && (
            <div className="text-sm rounded-xl px-4 py-3"
              style={{ background: 'rgba(248,113,113,.1)', border: '1px solid rgba(248,113,113,.3)', color: '#f87171' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="f-label">Nome completo</label>
              <input className="f-input" placeholder="Seu nome" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}/>
            </div>
            <div>
              <label className="f-label">Email</label>
              <input type="email" className="f-input" placeholder="email@exemplo.com" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}/>
            </div>
            <div>
              <label className="f-label">Senha</label>
              <input type="password" className="f-input" placeholder="Mínimo 6 caracteres" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}/>
            </div>

            {!hasInvite && (
              <div>
                <label className="f-label">Você é</label>
                <div className="grid grid-cols-2 gap-2">
                  {[['student','🏋️ Aluno'],['personal','👤 Personal']].map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => setForm(p => ({ ...p, role: val }))}
                      className="f-card p-3 text-center text-sm font-semibold transition-all"
                      style={{
                        borderColor: form.role === val ? 'var(--accent)' : 'var(--border)',
                        background:  form.role === val ? 'rgba(130,10,209,.08)' : 'var(--card)',
                        color:       form.role === val ? 'var(--accent-2)' : 'var(--text-3)',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Consentimento LGPD — obrigatório */}
            <label className="flex items-start gap-3 cursor-pointer pt-1">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--accent)', marginTop: 2, flexShrink: 0 }}/>
              <span className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>
                Li e aceito os{' '}
                <Link to="/terms" target="_blank" style={{ color: 'var(--accent-2)' }}>Termos de Uso</Link>
                {' '}e a{' '}
                <Link to="/privacy" target="_blank" style={{ color: 'var(--accent-2)' }}>Política de Privacidade</Link>.
                Consinto com o tratamento dos meus dados conforme a LGPD.
              </span>
            </label>

            <Button size="xl" loading={loading} disabled={!agreed} type="submit" className="mt-2 w-full">
              {loading ? 'Criando sua conta...' : hasInvite ? `Criar conta e conectar a ${trainerInfo?.name?.split(' ')[0] || 'seu personal'} →` : 'Criar conta gratuita →'}
            </Button>
          </form>

          <p className="text-center text-sm" style={{ color: 'var(--text-3)' }}>
            Já tem conta?{' '}
            <Link to="/login" style={{ color: 'var(--accent-2)', fontWeight: 600 }}>Entrar</Link>
          </p>

        </div>
      </div>
    </div>
  )
}
