import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { translateError } from '@/utils/helpers'
import { Chevron } from '@/components/ui'
import AndroidDownloadLink from '@/components/AndroidDownloadLink'

function VorynLogo() {
  return (
    <div className="flex items-center justify-center gap-3 mb-2">
      <img src="/voryn-logo-purple.png" alt="Voryn" className="w-12 h-12 rounded-2xl"
        style={{ border: '1px solid var(--line-strong)' }} />
      <span className="font-display text-4xl tracking-wide" style={{ color: 'var(--text-1)' }}>
        Voryn
      </span>
    </div>
  )
}

function AuthCard({ children, title, sub }) {
  return (
    <div className="auth-shell min-h-dvh flex flex-col items-center justify-center px-5 py-8"
      style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-4xl relative z-10 animate-slide-up grid md:grid-cols-[.85fr_1fr] gap-6 items-center">
        <div className="hidden md:block px-5">
          <h2 className="font-display text-7xl leading-[.82] tracking-wide mb-5">Treine.<br/><span style={{ color: 'var(--accent-text)' }}>Registre.</span><br/>Evolua.</h2>
          <p className="max-w-xs text-sm leading-relaxed" style={{ color: 'var(--text-3)' }}>O painel de treino para quem transforma consistência em resultado.</p>
          <div className="mt-8 flex gap-2">
            {['Foco', 'Carga', 'Ritmo'].map(item => <span key={item} className="f-badge f-badge-accent">{item}</span>)}
          </div>
        </div>
        <div>
        <div className="text-center mb-7">
          <VorynLogo />
        </div>
        <div className="glass-panel p-6 sm:p-8 space-y-5">
          <div className="mb-2">
            <h1 className="font-display text-3xl tracking-wide" style={{ color: 'var(--text-1)' }}>{title}</h1>
            {sub && <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{sub}</p>}
          </div>
          {children}
          <div className="text-center"><AndroidDownloadLink className="text-sm underline" style={{ color: 'var(--accent-text)' }} /></div>
        </div>
        </div>
      </div>
    </div>
  )
}

function ErrorBox({ msg }) {
  if (!msg) return null
  return (
    <div className="text-sm rounded-xl px-4 py-3 scale-in"
      style={{ background: 'rgba(var(--danger-rgb), .1)', border: '1px solid rgba(var(--danger-rgb), .3)', color: 'var(--danger)' }}>
      {msg}
    </div>
  )
}

// ── LOGIN ──────────────────────────────────────────────────
export function LoginPage() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const [params]   = useSearchParams()
  const redirectTo = params.get('redirect') || '/app'
  const [form,    setForm]    = useState({ email: '', password: '' })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw,  setShowPw]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await signIn(form)
    if (error) { setError(translateError(error)); setLoading(false) }
    else navigate(redirectTo)
  }

  return (
    <AuthCard title="Bem-vindo de volta" sub="Faça login para continuar">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="f-label" htmlFor="login-email">Email</label>
          <input id="login-email" type="email" className="f-input" placeholder="seu@email.com" autoComplete="email"
            value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required/>
        </div>
        <div className="space-y-1.5">
          <label className="f-label" htmlFor="login-password">Senha</label>
          <div style={{ position: 'relative' }}>
            <input id="login-password" type={showPw ? 'text' : 'password'} className="f-input" autoComplete="current-password"
              style={{ paddingRight: 48 }} placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required/>
            <button type="button" onClick={() => setShowPw(!showPw)}
              aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPw}
              style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
                background:'none', border:'none', cursor:'pointer', color:'var(--muted)' }}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {showPw
                  ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
                  : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                }
              </svg>
            </button>
          </div>
        </div>
        <ErrorBox msg={error}/>
        <button type="submit" id="voryn-login-btn" disabled={loading}
          className="f-btn f-btn-accent w-full py-4 text-base font-display"
          style={{ opacity: loading ? .65 : 1 }}>
          {loading ? 'Entrando...' : 'Entrar no Voryn'}
        </button>
        <div className="flex items-center justify-between text-sm">
          <Link to="/reset-password" style={{ color: 'var(--accent-text)' }}>
            Esqueceu a senha?
          </Link>
          <Link to="/register" style={{ color: 'var(--text-3)' }}>
            Criar conta
          </Link>
        </div>
      </form>
    </AuthCard>
  )
}

// ── REGISTER ───────────────────────────────────────────────
// ── RESET PASSWORD ─────────────────────────────────────────
export function ResetPasswordPage() {
  const { resetPassword, updatePassword } = useAuth()
  const navigate     = useNavigate()
  const isRecovery   = window.location.hash.includes('type=recovery')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [sent,     setSent]     = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleReset(e) {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await resetPassword(email)
    if (error) setError(translateError(error))
    else setSent(true)
    setLoading(false)
  }

  async function handleUpdate(e) {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await updatePassword(password)
    if (error) setError(translateError(error))
    else navigate('/app')
    setLoading(false)
  }

  return (
    <AuthCard
      title={isRecovery ? 'Nova senha' : 'Recuperar senha'}
      sub={isRecovery ? 'Digite sua nova senha' : 'Enviaremos um link por email'}>
      {sent ? (
        <div className="text-center space-y-3 py-4">
          <p className="font-display text-2xl" style={{ color: 'var(--text-1)' }}>Email enviado</p>
          <p style={{ color: 'var(--text-2)' }}>
            Link enviado para <strong>{email}</strong>
          </p>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Verifique sua caixa de entrada e spam.
          </p>
          <Link to="/login" style={{ color: 'var(--accent-text)', fontSize: 14 }}>
            Voltar ao login
          </Link>
        </div>
      ) : isRecovery ? (
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="f-label">Nova senha</label>
            <input type="password" className="f-input" placeholder="Mínimo 6 caracteres" autoComplete="new-password"
              value={password} onChange={e => setPassword(e.target.value)} required/>
          </div>
          <ErrorBox msg={error}/>
          <button type="submit" disabled={loading}
            className="f-btn f-btn-accent w-full py-4 text-base font-display">
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-1.5">
            <label className="f-label">Email</label>
            <input type="email" className="f-input" placeholder="seu@email.com" autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)} required/>
          </div>
          <ErrorBox msg={error}/>
          <button type="submit" disabled={loading}
            className="f-btn f-btn-accent w-full py-4 text-base font-display">
            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
          </button>
          <p className="text-center text-sm">
            <Link to="/login" className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
              <Chevron direction="left" size={14}/>
              Voltar ao login
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  )
}

export default LoginPage
