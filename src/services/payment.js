// ── Voryn — Payment Service (Mercado Pago) ────────────
//
// maxStudents abaixo é usado SÓ para exibição (vitrine de planos, contador
// "X/15 alunos" na UI). A fonte de verdade real do limite — a que de fato
// bloqueia ou permite vincular um aluno — vive no banco, na função SQL
// get_plan_max_students() (ver supabase/schema.sql). Se o limite de algum
// plano mudar, atualize os dois lugares: aqui (o que o usuário vê) e lá (o
// que é de fato aplicado).

export const PLANS = {
  student: {
    id:          'student',
    name:        'Plano Aluno',
    price:       14.90,
    period:      'mês',
    description: 'Para quem treina com método',
    maxStudents: 0,
    highlight:   false,
    features: [
      'Calendário de consistência',
      'Planejador semanal ilimitado',
      'Tracker de treino ao vivo',
      'Timer de descanso configurável',
      'Histórico completo',
      'Recordes Pessoais (PRs)',
      'Gráficos de evolução',
      'Metas semanais',
      'Conquistas e streaks',
      'Tema claro e escuro',
    ],
  },
  personal: {
    id:          'personal',
    name:        'Plano Personal',
    price:       59.90,
    period:      'mês',
    description: 'Para personal trainers',
    maxStudents: 15,
    highlight:   true,
    features: [
      'Tudo do Plano Aluno',
      'Até 15 alunos gerenciados',
      'Dashboard de alunos',
      'Criação de fichas de treino',
      'Avaliações físicas',
      'Chat direto com alunos',
      'Programas de treino',
      'Acompanhamento de evolução',
    ],
  },
  personal_pro: {
    id:          'personal_pro',
    name:        'Personal Pro',
    price:       99.90,
    period:      'mês',
    description: 'Para negócios em crescimento',
    maxStudents: 50,
    highlight:   false,
    features: [
      'Tudo do Personal',
      'Até 50 alunos',
      'Relatórios avançados',
      'Exportação de dados CSV',
      'Estatísticas detalhadas',
      'Suporte prioritário',
    ],
  },
}

// ── Create checkout session via Supabase Edge Function ────
// userId e userEmail não são mais enviados pelo client: a Edge Function
// extrai esses dados do JWT da sessão, validado no servidor. Isso evita
// que alguém crie uma assinatura em nome de outra pessoa (IDOR).
export async function createCheckoutSession({ planId, userName }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL não configurado.')

  const { supabase } = await import('@/lib/supabase')
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData?.session?.access_token
  if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.')

  const res = await fetch(`${supabaseUrl}/functions/v1/create-preference`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ planId, userName }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Erro ao criar sessão de pagamento.')
  return data
}

export function redirectToCheckout(initPoint) {
  window.location.href = initPoint
}
