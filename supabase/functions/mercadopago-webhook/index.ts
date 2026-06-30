// ──────────────────────────────────────────────────────────
//  Voryn — Mercado Pago Webhook com validação de assinatura
//  Deploy: supabase functions deploy mercadopago-webhook
//  Env vars necessárias:
//    MP_WEBHOOK_SECRET    → painel MP > Credenciais > Webhook Secret
//    MP_ACCESS_TOKEN      → painel MP > Credenciais de produção (necessário
//                           para buscar o status real da assinatura na API,
//                           já que o payload do webhook não traz o status)
//    SUPABASE_URL         → automático
//    SUPABASE_SERVICE_KEY → automático
// ──────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MP_SECRET = Deno.env.get('MP_WEBHOOK_SECRET')    ?? ''
const MP_TOKEN   = Deno.env.get('MP_ACCESS_TOKEN')      ?? ''
const SUPA_URL  = Deno.env.get('SUPABASE_URL')         ?? ''
const SUPA_KEY  = Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''

async function validateSignature(req: Request, body: string): Promise<boolean> {
  // Sem MP_WEBHOOK_SECRET configurado, REJEITAR — não aceitar (fail-closed).
  // A versão anterior retornava `true` (passava direto) quando o secret estava
  // ausente, o que permite a qualquer um forjar um webhook e ativar assinaturas
  // de graça caso a env var não tenha sido configurada em produção.
  if (!MP_SECRET) {
    console.error('[Voryn] MP_WEBHOOK_SECRET ausente — rejeitando webhook por segurança')
    return false
  }

  const sigHeader = req.headers.get('x-signature') ?? ''
  const reqId     = req.headers.get('x-request-id') ?? ''
  const ts        = sigHeader.match(/ts=([^,]+)/)?.[1]
  const received  = sigHeader.match(/v1=([a-f0-9]+)/)?.[1]
  if (!ts || !received) return false

  let dataId = ''
  try { dataId = (JSON.parse(body)?.data?.id ?? '') } catch { return false }

  const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(MP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest))
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('')
  return computed === received
}

function mapMpStatus(s: string) {
  // 'pending' (pagamento ainda não confirmado, ex: boleto aguardando compensação)
  // NÃO deve virar 'trialing' — isso reabria o período de trial pra quem nem
  // pagou ainda. Mapeamos para 'past_due', que reflete melhor "aguardando
  // confirmação" sem conceder acesso de trial de novo.
  return ({ authorized:'active', active:'active', paused:'past_due', cancelled:'canceled', pending:'past_due' })[s] ?? 'inactive'
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  const body = await req.text()
  if (!await validateSignature(req, body)) {
    console.error('[Voryn] Assinatura inválida')
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: Record<string, unknown>
  try { payload = JSON.parse(body) } catch { return new Response('Bad JSON', { status: 400 }) }

  const db = createClient(SUPA_URL, SUPA_KEY)
  const { type, action, data } = payload as Record<string, unknown> & { data: Record<string, unknown> }

  await db.from('payment_events').insert({
    event_type: `${type}:${action}`, external_id: String(data?.id ?? ''),
    payload, received_at: new Date().toISOString(),
  })

  if (type === 'subscription_preapproval') {
    const subId = data?.id as string

    // O corpo da notificação de webhook do Mercado Pago é só um ponteiro
    // ({ type, action, data: { id } }) — ele NÃO inclui o status atual do
    // recurso. A versão anterior lia `payload.status ?? data?.status`,
    // confiando em campos que quase certamente nunca existem nesse payload
    // (são campos do recurso completo, não da notificação). Isso faria
    // mpStatus vir undefined sempre, e mapMpStatus(undefined) caía
    // silenciosamente em 'inactive' — uma assinatura recém-autorizada com
    // sucesso seria marcada como inativa, sem nenhum erro visível.
    //
    // A forma correta é buscar o recurso completo na API usando o id.
    let mpStatus: string | undefined
    if (subId && MP_TOKEN) {
      try {
        const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${subId}`, {
          headers: { 'Authorization': `Bearer ${MP_TOKEN}` },
        })
        if (mpRes.ok) {
          const mpData = await mpRes.json()
          mpStatus = mpData?.status
        } else {
          console.error(`[Voryn] Falha ao buscar preapproval ${subId} na API do MP: ${mpRes.status}`)
        }
      } catch (e) {
        console.error('[Voryn] Erro ao consultar API do MP:', e)
      }
    }
    // Fallback: se por algum motivo a API não respondeu, ainda tentamos os
    // campos do payload (caso a MP mude o formato da notificação no
    // futuro e comece a incluir o status) antes de desistir.
    mpStatus = mpStatus ?? (payload.status as string) ?? (data?.status as string)

    const { data: sub } = await db.from('subscriptions').select('id,user_id').eq('external_id', subId).single()
    if (sub) {
      if (!mpStatus) {
        // Sem conseguir determinar o status real (API falhou e o payload
        // não trouxe nada), é mais seguro NÃO tocar na assinatura do que
        // gravar um status errado — registra o evento (já feito acima) e
        // sai, deixando para o próximo webhook de retry tentar de novo.
        console.error(`[Voryn] Não foi possível determinar o status da preapproval ${subId} — assinatura não foi alterada`)
        return new Response('OK (status unresolved)', { status: 200 })
      }

      const status = mapMpStatus(mpStatus)
      await db.from('subscriptions').update({
        status, external_status: mpStatus, updated_at: new Date().toISOString(),
        ...(status === 'active' ? {
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30*86400000).toISOString(),
        } : {}),
      }).eq('id', sub.id)

      // Notificar usuário via push quando o pagamento é confirmado
      if (status === 'active') {
        try {
          await fetch(`${SUPA_URL}/functions/v1/send-push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('CRON_SECRET') ?? ''}` },
            body: JSON.stringify({ mode: 'send', type: 'payment_confirmed', userIds: [sub.user_id] }),
          })
        } catch { /* non-critical */ }
      }
    } else {
      console.warn(`[Voryn] Webhook recebido para external_id=${subId} mas nenhuma subscription correspondente foi encontrada`)
    }
  }

  return new Response('OK', { status: 200 })
})
