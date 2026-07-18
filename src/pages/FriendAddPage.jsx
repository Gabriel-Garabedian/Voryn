import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { friendService } from '@/services'
import { Button } from '@/components/ui'

// Página pública de "me adicionar" — cada usuário tem um link pessoal
// fixo (código em users.friend_invite_code). Mesma lógica de
// CommunityJoinPage.jsx, mas 1-para-1 em vez de grupo com nome.
export default function FriendAddPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [targetName, setTargetName] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    // RPC em vez de select direto — a tabela users não tem policy pública
    // de leitura (de propósito), então um select direto por
    // friend_invite_code ficaria sempre vazio pra quem ainda não logou.
    supabase.rpc('get_user_name_by_friend_code', { p_code: code })
      .then(({ data, error: err }) => {
        if (err || !data) { setError('Link inválido ou expirado.'); setLoading(false); return }
        setTargetName(data)
        setLoading(false)
      })
  }, [code])

  async function handleConnect() {
    if (!user) {
      localStorage.setItem('voryn_pending_friend', code)
      navigate('/login')
      return
    }
    setConnecting(true)
    const { error: connErr } = await friendService.connect(code)
    setConnecting(false)
    if (connErr) {
      setError(connErr.message?.includes('a si mesmo')
        ? 'Esse é o seu próprio link — manda pra um amigo em vez disso.'
        : 'Não foi possível conectar agora. Tente de novo.')
      return
    }
    navigate('/app/community?tab=amigos')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🤝</div>
          <p className="font-display text-2xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
            Conectar no Voryn
          </p>
        </div>

        <div className="f-card p-6 space-y-4">
          {loading || authLoading ? (
            <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>Carregando...</p>
          ) : error ? (
            <>
              <p className="text-sm text-center" style={{ color: '#f87171' }}>{error}</p>
              <Link to="/" className="block text-center text-sm" style={{ color: 'var(--accent)' }}>Voltar ao início</Link>
            </>
          ) : (
            <>
              <p className="text-sm text-center" style={{ color: 'var(--text-2)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{targetName}</span> quer se conectar com você no Voryn. Vocês vão poder ver a frequência de treino e os recordes um do outro.
              </p>

              <Button size="xl" className="w-full" onClick={handleConnect} loading={connecting}>
                {user ? 'Conectar' : 'Continuar'}
              </Button>

              {!user && (
                <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
                  Você precisa de uma conta Voryn. Já tem uma?{' '}
                  <Link to="/login" onClick={() => localStorage.setItem('voryn_pending_friend', code)}
                    style={{ color: 'var(--accent)' }}>Fazer login</Link>
                  {' '}ou{' '}
                  <Link to="/register" onClick={() => localStorage.setItem('voryn_pending_friend', code)}
                    style={{ color: 'var(--accent)' }}>criar conta grátis</Link>.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
