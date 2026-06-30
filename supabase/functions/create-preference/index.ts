// ──────────────────────────────────────────────────────────
//  Voryn — Create MP Preference (Checkout Session)
//  Deploy: supabase functions deploy create-preference
//  Env vars:
//    MP_ACCESS_TOKEN  → painel MP > Credenciais > Access Token
//    MP_PLAN_STUDENT  → preapproval_plan_id do Plano Aluno
//    MP_PLAN_PERSONAL → preapproval_plan_id do Plano Personal
//    MP_PLAN_PRO      → preapproval_plan_id do Personal Pro
//    APP_URL          → https://vorynapp.com.br
//
//  SEGURANÇA: userId e userEmail são extraídos do JWT validado
//  da sessão, NUNCA confiados a partir do corpo da requisição.
//  Isso evita que alguém crie uma assinatura "pending" em nome
//  de outro usuário apenas trocando o userId enviado (IDOR).
// ──────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MP_TOKEN   = Deno.env.get('MP_ACCESS_TOKEN')      ?? ''
const SUPA_URL   = Deno.env.get('SUPABASE_URL')         ?? ''
const SUPA_KEY   = Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''
const ANON_KEY   = Deno.env.get('SUPABASE_ANON_KEY')    ?? ''
const APP_URL    = Deno.env.get('APP_URL')             ?? 'https://vorynapp.com.br'

// Map planId → preapproval_plan_id no MP
const PLAN_IDS: Record<string, string> = {
  student:      Deno.env.get('MP_PLAN_STUDENT')  ?? '',
  personal:     Deno.env.get('MP_PLAN_PERSONAL') ?? '',
  personal_pro: Deno.env.get('MP_PLAN_PRO')      ?? '',
}

// Preços de fallback caso o plano MP não seja preapproval.
// DUPLICAÇÃO CONHECIDA E ACEITA: o frontend já foi consolidado para usar
// uma única fonte de preços (src/services/payment.js, PLANS), eliminando
// a duplicação que existia em 5 lugares diferentes do React. Esta Edge
// Function NÃO pode importar diretamente de src/ — roda em runtime Deno
// separado do bundle Vite do frontend, são ambientes de execução
// diferentes. Se o preço de algum plano mudar, é preciso atualizar AQUI e
// em src/services/payment.js manualmente. Eliminar essa duplicação por
// completo exigiria mover os preços para uma tabela no banco (consultável
// por ambos os lados) — não fiz essa mudança estrutural maior nesta
// rodada por ser fora do escopo de correção pontual de bug.
const PRICES: Record<string, number> = {
  student:      14.90,
  personal:     59.90,
  personal_pro: 99.90,
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST')   return new Response('Method Not Allowed', { status: 405 })

  // ── Validar o JWT do usuário e extrair userId/email REAIS ──
  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '')

  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Não autenticado' }),
      { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  const authClient = createClient(SUPA_URL, ANON_KEY || SUPA_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
  const { data: authData, error: authErr } = await authClient.auth.getUser(jwt)

  if (authErr || !authData?.user) {
    return new Response(JSON.stringify({ error: 'Sessão inválida ou expirada' }),
      { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  const userId    = authData.user.id              // ← confiável: vem do JWT validado
  const userEmail = authData.user.email ?? ''      // ← confiável: vem do JWT validado

  let body: Record<string, string>
  try { body = await req.json() }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS }) }

  // planId e userName continuam vindo do client — não são sensíveis (não concedem
  // acesso a recursos de outra pessoa, só afetam a própria compra do usuário autenticado)
  const { planId, userName } = body

  if (!planId) {
    return new Response(
      JSON.stringify({ error: 'planId é obrigatório' }),
      { status: 400, headers: CORS }
    )
  }

  if (!PLAN_IDS[planId]) {
    // Removido o fallback de "pagamento único" (checkout/preferences) que
    // existia aqui antes. Esse fallback gerava um pagamento do tipo
    // 'payment' no Mercado Pago, mas o webhook só trata
    // type === 'subscription_preapproval' — ou seja, o cliente pagava e a
    // assinatura NUNCA era ativada no banco, porque nenhum evento
    // correspondente chegava no formato esperado. Preferimos falhar de forma
    // clara e visível em vez de cobrar alguém sem entregar acesso.
    return new Response(
      JSON.stringify({
        error: `Plano "${planId}" ainda não está configurado no Mercado Pago (preapproval_plan_id ausente). Configure MP_PLAN_${planId.toUpperCase()} antes de habilitar este plano.`,
      }),
      { status: 500, headers: CORS }
    )
  }

  if (!MP_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'MP_ACCESS_TOKEN não configurado' }),
      { status: 500, headers: CORS }
    )
  }

  const db = createClient(SUPA_URL, SUPA_KEY)

  // Checa se já existe uma assinatura ativa, em trial ou pendente para este
  // usuário ANTES de criar uma nova preapproval no Mercado Pago. Sem isso,
  // clicar em "assinar" duas vezes (double-click, ou voltar para /pricing
  // depois de já ter iniciado um checkout sem completar) criava uma SEGUNDA
  // preapproval no MP a cada vez — e o upsert abaixo sobrescrevia
  // external_id com o novo id, perdendo a referência à preapproval
  // anterior, que continuava existindo e ativa do lado do MP. Se ambas
  // fossem aprovadas pelo usuário (ex: em duas abas diferentes), o cliente
  // seria cobrado duas vezes.
  const { data: existingSub } = await db
    .from('subscriptions')
    .select('status, plan, external_id')
    .eq('user_id', userId)
    .single()

  // Bloqueia só quando é o MESMO plano que já está ativo/pendente — isso é
  // o cenário de double-click ou reload acidental da página de checkout.
  // ANTES desta correção mais específica, a checagem bloqueava qualquer
  // assinatura ativa, mesmo para um plano DIFERENTE — isso quebrava o
  // fluxo de upgrade/downgrade legítimo (ex: personal indo de 'personal'
  // para 'personal_pro' ao bater no limite de alunos), que é exatamente o
  // botão "Fazer upgrade" already existente no dashboard do personal.
  if (existingSub && existingSub.plan === planId &&
      ['active', 'pending'].includes(existingSub.status) && existingSub.external_id) {
    return new Response(
      JSON.stringify({
        error: existingSub.status === 'active'
          ? 'Você já tem uma assinatura ativa neste plano.'
          : 'Já existe um pagamento em processamento para este plano. Aguarde a confirmação ou tente novamente em alguns minutos.',
      }),
      { status: 409, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }

  // Upgrade/downgrade para um plano DIFERENTE do atual: se havia uma
  // preapproval anterior ainda ativa no MP, cancelamos ela antes de criar a
  // nova — sem isso, o cliente ficaria com DUAS cobranças recorrentes
  // simultâneas no Mercado Pago (a antiga nunca seria cancelada
  // automaticamente só porque uma nova foi criada).
  if (existingSub && existingSub.plan !== planId && existingSub.status === 'active' && existingSub.external_id && MP_TOKEN) {
    try {
      await fetch(`https://api.mercadopago.com/preapproval/${existingSub.external_id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${MP_TOKEN}` },
        body:    JSON.stringify({ status: 'cancelled' }),
      })
    } catch (e) {
      console.error('[create-preference] Falha ao cancelar preapproval anterior antes do upgrade:', e)
      // Não bloqueia o upgrade por causa disso — mas registra para
      // investigação manual, já que pode resultar em cobrança duplicada.
    }
  }

  try {
    // ── Usar preapproval_plan_id (planos recorrentes MP) ──
    const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${MP_TOKEN}`,
      },
      body: JSON.stringify({
        preapproval_plan_id: PLAN_IDS[planId],
        payer_email:         userEmail,
        reason:              `Voryn ${planId}`,
        back_url:            `${APP_URL}/app?payment=success`,
        external_reference:  `${userId}|${planId}`,
        auto_recurring: {
              frequency:          1,
              frequency_type:     'months',
              start_date:         new Date().toISOString(),
              end_date:           new Date(Date.now() + 365*86400000).toISOString(),
              transaction_amount: PRICES[planId],
              currency_id:        'BRL',
        },
      }),
    })
    const mpData = await mpRes.json()
    if (!mpRes.ok) throw new Error(mpData.message || 'Erro ao criar assinatura no MP')

    // Registrar intenção de assinatura no banco.
    // CRÍTICO: o erro do upsert é checado e propagado. Antes, esta chamada
    // era feita com um simples "await" sem checar o retorno — se o upsert
    // falhasse (ex: violação de check constraint), o erro era engolido
    // silenciosamente e o usuário recebia init_point normalmente, sendo
    // cobrado no Mercado Pago sem nenhum registro 'pending' existir no
    // banco. Quando o webhook tentasse ativar a assinatura por
    // external_id depois do pagamento, não encontrava nada para
    // atualizar — o cliente pagava e nunca recebia acesso, sem nenhum
    // log ou alerta apontando a causa real.
    const { error: subErr } = await db.from('subscriptions').upsert({
      user_id:     userId,
      plan:        planId,
      status:      'pending',
      external_id: mpData.id,
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (subErr) {
      console.error('[create-preference] Falha ao registrar subscription pending:', subErr)
      throw new Error('Erro ao registrar assinatura. Tente novamente em instantes.')
    }

    return new Response(
      JSON.stringify({ init_point: mpData.init_point }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[create-preference] Error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: CORS }
    )
  }
})
