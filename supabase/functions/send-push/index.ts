// ──────────────────────────────────────────────────────────
//  Voryn — Server-Side Push Notification Sender
//  Deploy: supabase functions deploy send-push
//  Env:    VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL
//          SUPABASE_URL, SUPABASE_SERVICE_KEY
//
//  Usos:
//  1. Cron diário: lembrete de treino
//  2. Chamado pelo weekly-email após envio
//  3. Chamado pelo webhook após pagamento
//  4. Chamado diretamente via API para notificações ad-hoc
// ──────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')  ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_EMAIL   = Deno.env.get('VAPID_EMAIL')       ?? 'mailto:contato@vorynapp.com.br'
const SUPA_URL      = Deno.env.get('SUPABASE_URL')      ?? ''
const SUPA_KEY      = Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''
const CRON_SECRET   = Deno.env.get('CRON_SECRET')       ?? ''

const db = createClient(SUPA_URL, SUPA_KEY)

// ── VAPID JWT helper (Deno native crypto) ─────────────────
async function buildVapidAuthHeader(audience: string): Promise<string> {
  const header  = { alg: 'ES256', typ: 'JWT' }
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_EMAIL,
  }
  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')

  const unsigned = `${enc(header)}.${enc(payload)}`

  // Import private key (PKCS8 base64url or raw)
  let keyData: Uint8Array
  try {
    const b64 = VAPID_PRIVATE.replace(/-/g,'+').replace(/_/g,'/')
    keyData = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  } catch {
    throw new Error('VAPID_PRIVATE_KEY inválida')
  }

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyData.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsigned)
  )
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')

  const token = `${unsigned}.${sigB64}`
  return `vapid t=${token},k=${VAPID_PUBLIC}`
}

// ── Send one push notification ─────────────────────────────
async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: object): Promise<boolean> {
  const url      = new URL(sub.endpoint)
  const audience = `${url.protocol}//${url.host}`

  let vapidAuth: string
  try { vapidAuth = await buildVapidAuthHeader(audience) }
  catch (e) { console.error('[Push] VAPID build failed:', e); return false }

  const body = JSON.stringify(payload)
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': vapidAuth,
      'TTL':           '86400',
    },
    body,
  })

  if (res.status === 410 || res.status === 404) {
    // Subscription expired — remove from DB
    await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  }

  return res.ok
}

// ── Notification templates ────────────────────────────────
function buildPayload(type: string, data: Record<string, unknown> = {}): object {
  const templates: Record<string, object> = {
    daily_reminder: {
      title: 'Hora de treinar! 💪',
      body:  data.workoutName ? `Treino de hoje: ${data.workoutName}` : 'Você tem um treino programado hoje.',
      icon:  '/voryn-icon-192.png',
      badge: '/voryn-badge-96.png',
      tag:   'daily-reminder',
      url:   '/app/workout',
      actions: [{ action: 'open', title: '🏋️ Abrir treino' }],
    },
    streak_milestone: {
      title: `🔥 ${data.streak} dias de sequência!`,
      body:  'Você está arrasando! Continue assim.',
      icon:  '/voryn-icon-192.png',
      badge: '/voryn-badge-96.png',
      tag:   'streak',
      url:   '/app',
    },
    weekly_summary: {
      title: `Semana passada: ${data.workouts} treino${Number(data.workouts) !== 1 ? 's' : ''} 📊`,
      body:  data.volume ? `Volume total: ${data.volume}` : 'Veja seu resumo completo no app.',
      icon:  '/voryn-icon-192.png',
      badge: '/voryn-badge-96.png',
      tag:   'weekly',
      url:   '/app/evolution',
    },
    payment_confirmed: {
      title: '✅ Pagamento confirmado!',
      body:  'Sua assinatura está ativa. Bom treino!',
      icon:  '/voryn-icon-192.png',
      badge: '/voryn-badge-96.png',
      tag:   'payment',
      url:   '/app',
    },
    // Antes chamado 'trainer_message' e fixo em "mensagem de [trainerName]"
    // com url sempre '/app/personal' — funcionava só quando o personal
    // enviava para o aluno. Como o chat é bidirecional, generalizado para
    // 'chat_message': o nome de quem enviou e a tela de destino (a página
    // de chat de quem RECEBE a notificação) vêm de `data`, calculados no
    // banco (ver notify_new_message em schema.sql), que sabe quem é quem.
    chat_message: {
      title: `💬 Mensagem de ${data.senderName || 'alguém'}`,
      body:  String(data.preview || 'Toque para ler a mensagem.').slice(0, 80),
      icon:  '/voryn-icon-192.png',
      badge: '/voryn-badge-96.png',
      tag:   'chat',
      url:   String(data.url || '/app'),
    },
  }
  return templates[type] ?? { title: 'Voryn', body: 'Novidade no app!', icon: '/voryn-icon-192.png', url: '/app' }
}

// ── Bulk sender ───────────────────────────────────────────
async function sendToUsers(userIds: string[], type: string, data = {}): Promise<{ sent: number; failed: number }> {
  const { data: subs } = await db
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (!subs?.length) return { sent: 0, failed: 0 }

  const payload = buildPayload(type, data)
  const results = await Promise.allSettled(subs.map(s => sendPush(s, payload)))
  const sent    = results.filter(r => r.status === 'fulfilled' && r.value).length
  return { sent, failed: results.length - sent }
}

// ── Daily reminder cron ───────────────────────────────────
async function runDailyReminder() {
  const now = new Date()
  const dayIndex = now.getDay() // 0=Sun … 6=Sat

  // Get all users who have a routine planned for today
  const { data: routines } = await db
    .from('routines')
    .select('user_id, name, exercises')
    .eq('day_index', dayIndex)

  if (!routines?.length) return { sent: 0 }

  // Filter out users who already trained today. Usamos a coluna 'date' (data
  // real do treino, a mesma usada em todo o resto do app) em vez de
  // 'created_at' (data de criação do registro) — perto da meia-noite ou em
  // fusos diferentes, as duas podem divergir e gerar lembrete indevido para
  // quem já treinou, ou deixar de notificar quem ainda não treinou.
  const today = now.toISOString().split('T')[0]
  const userIds = routines.map(r => r.user_id)
  const { data: alreadyTrained } = await db
    .from('workout_logs')
    .select('user_id')
    .in('user_id', userIds)
    .eq('date', today)

  const trainedToday = new Set((alreadyTrained || []).map(l => l.user_id))
  const toNotify = routines.filter(r => !trainedToday.has(r.user_id))

  if (!toNotify.length) return { sent: 0 }

  let totalSent = 0
  for (const r of toNotify) {
    const { data: subs } = await db
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', r.user_id)
    if (!subs?.length) continue
    const payload = buildPayload('daily_reminder', {
      workoutName: r.name || `Treino de ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][dayIndex]}`
    })
    const results = await Promise.allSettled(subs.map(s => sendPush(s, payload)))
    totalSent += results.filter(r2 => r2.status === 'fulfilled' && (r2 as PromiseFulfilledResult<boolean>).value).length
  }
  return { sent: totalSent }
}

// ── Main handler ──────────────────────────────────────────
serve(async (req) => {
  // Auth check — exige sempre o CRON_SECRET configurado e correto.
  // Antes, a checagem só rejeitava quando CRON_SECRET existia; se a env var
  // estivesse ausente, qualquer chamada sem autenticação passava (fail-open),
  // permitindo enviar push em massa pra base inteira sem nenhuma credencial.
  const auth = req.headers.get('Authorization') ?? ''
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { body = {} }

  const mode    = (body.mode as string) || 'daily_reminder'
  const userIds = body.userIds as string[] | undefined
  const data    = (body.data as Record<string, unknown>) || {}

  try {
    if (mode === 'daily_reminder') {
      const result = await runDailyReminder()
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
    }

    if (mode === 'send' && userIds?.length) {
      const type   = (body.type as string) || 'daily_reminder'
      const result = await sendToUsers(userIds, type, data)
      return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'mode inválido' }), { status: 400 })
  } catch (e) {
    console.error('[send-push] Error:', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
