import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { communityService } from '@/services'
import { Button } from '@/components/ui'

// Página pública de convite — quem recebe um link de comunidade cai aqui,
// logado ou não. Modelo "só por convite": esta é a ÚNICA porta de entrada
// pra um grupo, não existe busca pública em lugar nenhum do app.
export default function CommunityJoinPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [community, setCommunity] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [joining,   setJoining]   = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    communityService.getByInviteCode(code).then(({ data, error: err }) => {
      if (err || !data) { setError('Convite inválido ou expirado.'); setLoading(false); return }
      setCommunity(data)
      setLoading(false)
    })
  }, [code])

  async function handleJoin() {
    if (!user) {
      // Guarda o convite pendente e manda pro login — mesmo padrão já
      // usado no convite personal→aluno (voryn_pending_trainer), aqui
      // adaptado pra comunidade. AuthContext consome isso automaticamente
      // depois que a pessoa loga ou cria conta, não importa qual caminho.
      localStorage.setItem('voryn_pending_community', code)
      navigate('/login')
      return
    }
    setJoining(true)
    const { error: joinErr } = await communityService.join(community.id, user.id)
    setJoining(false)
    if (joinErr && !String(joinErr.message || '').includes('duplicate')) {
      setError('Não foi possível entrar no grupo agora. Tente de novo.')
      return
    }
    navigate('/app/community')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">👥</div>
          <p className="font-display text-2xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
            Convite para grupo
          </p>
        </div>

        <div className="f-card p-6 space-y-4">
          {loading || authLoading ? (
            <p className="text-sm text-center" style={{ color: 'var(--text-3)' }}>Carregando convite...</p>
          ) : error ? (
            <>
              <p className="text-sm text-center" style={{ color: '#f87171' }}>{error}</p>
              <Link to="/" className="block text-center text-sm" style={{ color: 'var(--accent)' }}>Voltar ao início</Link>
            </>
          ) : (
            <>
              <div className="text-center">
                <p className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>{community.name}</p>
                {community.description && (
                  <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>{community.description}</p>
                )}
                <p className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>
                  Criado por {community.creator_name} · {community.member_count} membro{community.member_count !== 1 ? 's' : ''}
                </p>
              </div>

              <Button size="xl" className="w-full" onClick={handleJoin} loading={joining}>
                {user ? 'Entrar no grupo' : 'Continuar'}
              </Button>

              {!user && (
                <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
                  Você precisa de uma conta Voryn para entrar. Já tem uma?{' '}
                  <Link to="/login" onClick={() => localStorage.setItem('voryn_pending_community', code)}
                    style={{ color: 'var(--accent)' }}>Fazer login</Link>
                  {' '}ou{' '}
                  <Link to="/register" onClick={() => localStorage.setItem('voryn_pending_community', code)}
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
