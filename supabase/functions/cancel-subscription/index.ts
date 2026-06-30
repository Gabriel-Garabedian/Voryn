// ──────────────────────────────────────────────────────────
//  Voryn — Cancel Subscription
//  Cancels the MP preapproval and updates the DB status
//
//  SEGURANÇA: o userId é extraído do JWT validado da sessão,
//  NUNCA confiado a partir do corpo da requisição. Isso evita
//  que um usuário cancele a assinatura de outra pessoa apenas
//  trocando o userId enviado (IDOR).
// ──────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MP_TOKEN  = Deno.env.get('MP_ACCESS_TOKEN')      ?? ''
const SUPA_URL  = Deno.env.get('SUPABASE_URL')         ?? ''
const SUPA_KEY  = Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''
const ANON_KEY  = Deno.env.get('SUPABASE_ANON_KEY')    ?? ''
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  // ── Validar o JWT do usuário e extrair o userId REAL ──────
  // Usamos um client com a anon key + o JWT do header Authorization
  // para que o Supabase valide a assinatura do token e nos diga
  // quem é o usuário autenticado de verdade — sem confiar no client.
  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '')

  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Não autenticado' }),
      { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  const authClient = createClient(SUPA_URL, ANON_KEY || SUPA_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
  const { data: userData, error: userErr } = await authClient.auth.getUser(jwt)

  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Sessão inválida ou expirada' }),
      { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  const userId = userData.user.id // ← único userId confiável: o do JWT validado

  const db = createClient(SUPA_URL, SUPA_KEY)

  // 1. Find the active subscription
  const { data: sub } = await db
    .from('subscriptions')
    .select('id, external_id, status')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .single()

  if (!sub) {
    return new Response(
      JSON.stringify({ error: 'Nenhuma assinatura ativa encontrada' }),
      { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }

  // 2. Cancel on MP if has external_id and access token
  if (sub.external_id && MP_TOKEN) {
    try {
      await fetch(`https://api.mercadopago.com/preapproval/${sub.external_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${MP_TOKEN}`,
        },
        body: JSON.stringify({ status: 'cancelled' }),
      })
    } catch (e) {
      console.warn('[cancel] MP cancel failed (non-critical):', e)
      // Continue to update DB regardless
    }
  }

  // 3. Update DB status
  // Não cortamos o acesso na hora: marcamos cancel_at_period_end e deixamos o
  // status como 'active' (se já estava ativo) até o fim do período já pago.
  // Quem está em 'trialing' sem nunca ter pago perde o acesso imediatamente,
  // já que não há período pago a respeitar. O webhook do MP (ou uma rotina
  // de cron) é responsável por mudar o status para 'canceled' de fato quando
  // current_period_end passar.
  const newStatus = sub.status === 'trialing' ? 'canceled' : sub.status

  const { error } = await db
    .from('subscriptions')
    .update({
      status:               newStatus,
      cancel_at_period_end: true,
      updated_at:           new Date().toISOString(),
    })
    .eq('id', sub.id)

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Falha ao atualizar banco de dados' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({
      ok: true,
      message: newStatus === 'canceled'
        ? 'Assinatura cancelada com sucesso'
        : 'Assinatura cancelada. Seu acesso continua até o fim do período já pago.',
    }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } }
  )
})
