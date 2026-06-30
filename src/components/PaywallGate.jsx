import React from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'

const STATUS_COPY = {
  inactive: {
    title:   'Seu acesso expirou',
    message: 'Seu período gratuito ou assinatura não está mais ativo. Assine um plano para continuar treinando com o Voryn.',
    icon:    '🔒',
  },
  canceled: {
    title:   'Assinatura cancelada',
    message: 'Sua assinatura foi cancelada e o período pago já terminou. Assine novamente para continuar usando o Voryn.',
    icon:    '🔒',
  },
  past_due: {
    title:   'Pagamento pendente',
    message: 'Não conseguimos confirmar seu último pagamento. Assine novamente para regularizar e continuar usando o Voryn.',
    icon:    '⚠️',
  },
  // Mudança de modelo de negócio: aluno pode ter acesso liberado pelo
  // plano do personal, sem nunca ter pago a própria mensalidade. Se esse
  // vínculo deixar de valer (personal cancelou, ou o vínculo foi
  // desfeito) e o aluno também nunca teve assinatura própria ativa, a
  // mensagem genérica de "assinatura cancelada" seria confusa — ele nunca
  // assinou nada. Esta mensagem explica a causa real.
  no_trainer_access: {
    title:   'Acesso via personal encerrado',
    message: 'Seu acesso gratuito estava vinculado ao plano do seu personal, que não está mais ativo. Assine um plano próprio para continuar usando o Voryn, ou peça ao seu personal para regularizar a assinatura dele.',
    icon:    '🔒',
  },
}

// Tela de bloqueio exibida quando a assinatura do usuário não está ativa
// (nem 'active' nem 'trialing') e também não há acesso liberado pelo plano
// do personal vinculado. Substitui o conteúdo do app, mas ainda permite ir
// para a tela de assinatura/checkout e sair da conta.
export default function PaywallGate({ status, hadTrainerAccess, onSignOut }) {
  const effectiveStatus = (status === 'inactive' && hadTrainerAccess) ? 'no_trainer_access' : status
  const copy = STATUS_COPY[effectiveStatus] || STATUS_COPY.inactive

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 text-center"
      style={{ background: 'var(--bg)' }}>
      <div className="text-5xl mb-5">{copy.icon}</div>
      <h1 className="font-display text-2xl uppercase tracking-wide mb-2" style={{ color: 'var(--text-1)' }}>
        {copy.title}
      </h1>
      <p className="text-sm max-w-sm mb-8" style={{ color: 'var(--text-3)' }}>
        {copy.message}
      </p>

      <div className="w-full max-w-xs space-y-3">
        <Link to="/app/subscription">
          <Button size="xl" className="w-full">Ver planos e assinar</Button>
        </Link>
        <button onClick={onSignOut}
          className="w-full text-center text-sm py-2 transition-colors"
          style={{ color: 'var(--text-3)' }}>
          Sair da conta
        </button>
      </div>
    </div>
  )
}
