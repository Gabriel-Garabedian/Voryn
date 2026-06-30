import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { PLANS } from '@/services/payment'
import { useToast } from '@/components/ui/Toast'
import { captureError } from '@/lib/sentry'
import { Button, Badge } from '@/components/ui'
import { supabase } from '@/lib/supabase'

export default function SubscriptionView() {
  const { profile, plan, subStatus, hasTrainerAccess, user, refreshProfile } = useAuth()
  const toast = useToast()
  const [cancelling, setCancelling] = React.useState(false)
  const [cancelDone, setCancelDone] = React.useState(false)
  const navigate = useNavigate()
  const sub      = profile?.subscriptions?.[0]
  const current  = PLANS[plan]

  const trialEnds    = sub?.trial_ends_at
  const trialDaysLeft = trialEnds
    ? Math.max(0, Math.ceil((new Date(trialEnds) - new Date()) / 86400000))
    : 0

  const statusMap = {
    active:   { label: 'Ativo',     variant: 'green',  icon: '✅' },
    trialing: { label: 'Trial',     variant: 'yellow', icon: '⏱' },
    canceled: { label: 'Cancelado', variant: 'red',    icon: '❌' },
    past_due: { label: 'Vencido',   variant: 'red',    icon: '⚠️' },
    inactive: { label: 'Inativo',   variant: 'red',    icon: '🔒' },
  }
  // Aluno sem assinatura própria, mas com acesso liberado pelo plano do
  // personal: sem esta checagem, a tela mostrava "Plano Grátis" com badge
  // "🔒 Inativo" para alguém que na verdade TEM acesso liberado — confuso,
  // dava a entender que precisava assinar quando não precisava.
  const accessViaTrainer = !['active', 'trialing'].includes(subStatus) && hasTrainerAccess
  const si = accessViaTrainer
    ? { label: 'Incluso pelo personal', variant: 'green', icon: '🤝' }
    : (statusMap[subStatus] || statusMap.inactive)

  async function handleCancel() {
    if (!window.confirm('Tem certeza? Seu acesso continua até o fim do período pago.')) return
    setCancelling(true)
    try {
      const supaUrl = import.meta.env.VITE_SUPABASE_URL
      // Enviamos o JWT real da sessão (não a anonKey pública) para que a Edge Function
      // possa validar de verdade quem está chamando e cancelar SOMENTE a própria assinatura.
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token
      if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.')

      const res = await fetch(`${supaUrl}/functions/v1/cancel-subscription`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body:    JSON.stringify({}), // userId não é mais enviado pelo cliente — a função extrai do JWT
      })
      if (res.ok) {
        setCancelDone(true)
        toast.success('Assinatura cancelada. Seu acesso continua até o fim do período.')
        await refreshProfile()
      } else {
        throw new Error('Falha ao cancelar')
      }
    } catch (e) {
      captureError(e, { context: 'cancel_subscription', userId: user?.id })
      toast.error('Não foi possível cancelar automaticamente. Envie um email para suporte@vorynapp.com.br')
    }
    setCancelling(false)
  }

  return (
    <div className="px-4 pt-6 pb-10 space-y-6">
      <div>
        <h1 className="font-display text-3xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
          Assinatura
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>Gerencie seu plano e pagamentos</p>
      </div>

      {/* Current plan card */}
      <div className="f-card p-5"
        style={subStatus === 'active' ? { borderColor: 'rgba(var(--accent-rgb),.4)', background: 'rgba(var(--accent-rgb),.03)' } : {}}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="f-label mb-1">Plano atual</p>
            <h2 className="font-display text-2xl uppercase tracking-wide" style={{ color: 'var(--text-1)' }}>
              {accessViaTrainer ? 'Acesso via Personal' : (current?.name || 'Plano Grátis')}
            </h2>
            {current && !accessViaTrainer && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-3)' }}>
                R$ {current.price.toFixed(2).replace('.', ',')} / mês
              </p>
            )}
          </div>
          <Badge variant={si.variant}>{si.icon} {si.label}</Badge>
        </div>

        {accessViaTrainer && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.2)', color: '#4ade80' }}>
            🤝 Seu acesso ao Voryn está incluso no plano do seu personal — você não precisa pagar nada enquanto esse vínculo estiver ativo.
          </div>
        )}

        {subStatus === 'trialing' && trialDaysLeft > 0 && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(250,204,21,.08)', border: '1px solid rgba(250,204,21,.2)', color: '#facc15' }}>
            ⏱ Seu trial expira em <strong>{trialDaysLeft} dia{trialDaysLeft !== 1 ? 's' : ''}</strong>.
            Assine agora para não perder o acesso.
          </div>
        )}

        {subStatus === 'past_due' && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.2)', color: '#f87171' }}>
            ⚠️ Seu pagamento está em atraso. Assine novamente abaixo para regularizar.
          </div>
        )}

        {sub?.current_period_end && subStatus === 'active' && (
          <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
            Próxima cobrança: {new Date(sub.current_period_end).toLocaleDateString('pt-BR')}
          </p>
        )}

        {current && (
          <ul className="space-y-2 mb-4">
            {current.features.map(f => (
              <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24"
                  stroke="var(--accent-2)" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Plan comparison */}
      <div>
        <p className="f-label mb-3">Mudar de plano</p>
        <div className="space-y-3">
          {Object.values(PLANS).map(p => {
            const isCurrent = p.id === plan
            return (
              <div key={p.id} className="f-card p-4 flex items-center justify-between"
                style={p.highlight && !isCurrent ? { borderColor: 'rgba(var(--accent-rgb),.3)' } : {}}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{p.name}</p>
                    {p.highlight && <Badge variant="accent">Popular</Badge>}
                    {isCurrent && <Badge variant="green">Atual</Badge>}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                    R$ {p.price.toFixed(2).replace('.', ',')} / mês
                    {p.maxStudents > 0 && ` · até ${p.maxStudents} alunos`}
                  </p>
                </div>
                {!isCurrent && (
                  <Link to={`/checkout/${p.id}`}>
                    <Button size="sm" variant={p.highlight ? 'accent' : 'ghost'}>
                      {plan === 'free' || !current ? 'Assinar' : 'Mudar'}
                    </Button>
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Payment methods info */}
      <div className="f-card p-4">
        <p className="f-label mb-3">Pagamento</p>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(0,158,227,.1)', border: '1px solid rgba(0,158,227,.2)' }}>
            <span style={{ fontSize: 18 }}>💳</span>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Mercado Pago</p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Cartão de crédito, débito, Pix ou boleto
            </p>
          </div>
        </div>
      </div>

      {/* Cancel */}
      {(subStatus === 'active' || subStatus === 'trialing') && (
        <div>
          <p className="f-label mb-2">Cancelar assinatura</p>
          <div className="f-card p-4">
            <p className="text-sm mb-3" style={{ color: 'var(--text-3)' }}>
              Ao cancelar, você mantém o acesso até o fim do período pago.
              Após isso, o acesso será limitado ao plano gratuito.
            </p>
            {cancelDone ? (
              <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>
                ✅ Cancelamento processado. Seu acesso continua disponível até o fim do período já pago.
              </p>
            ) : (
              <button onClick={handleCancel} disabled={cancelling}
                className="inline-flex items-center gap-2 text-sm font-semibold transition-all"
                style={{ color: 'rgba(239,68,68,.7)', opacity: cancelling ? .6 : 1 }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                {cancelling ? 'Cancelando...' : 'Cancelar assinatura'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Data portability */}
      <div className="f-card p-4" style={{ borderColor: 'rgba(var(--accent-rgb),.15)' }}>
        <p className="f-label mb-2">Seus dados</p>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          Seus treinos e histórico são seus. Ao cancelar, seus dados ficam preservados por 30 dias
          e você pode solicitar exportação por email a qualquer momento.
        </p>
        <a href="mailto:privacidade@vorynapp.com.br?subject=Exportar meus dados"
          className="inline-flex items-center gap-1.5 text-xs mt-2 font-semibold"
          style={{ color: 'var(--accent-2)' }}>
          Solicitar exportação de dados →
        </a>
      </div>

      <div className="text-center">
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
          Dúvidas? Entre em contato:{' '}
          <a href="mailto:suporte@vorynapp.com.br"
            style={{ color: 'var(--accent-2)' }}>
            suporte@vorynapp.com.br
          </a>
        </p>
      </div>
    </div>
  )
}
