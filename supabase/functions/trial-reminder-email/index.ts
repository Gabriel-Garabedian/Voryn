// ──────────────────────────────────────────────────────────
//  Voryn — Trial Ending Reminder (email + push)
//  Schedule: diariamente, qualquer horário (ex: 09:00 BRT)
//  Deploy: supabase functions deploy trial-reminder-email
//  Cron:   0 12 * * *  (12 UTC = 09 BRT)
//  Env:    RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, CRON_SECRET
//
//  Antes, não existia NENHUM aviso de "seu trial está acabando" em lugar
//  nenhum — nem email, nem push, nem banner no app. O trial simplesmente
//  expirava e a pessoa sumia, em vez de ser lembrada a assinar. Este é o
//  gatilho de conversão mais óbvio que faltava no funil.
//
//  Idempotência: usa subscriptions.trial_reminder_sent_at (null = ainda
//  não enviado) para nunca mandar o mesmo aviso duas vezes para a mesma
//  pessoa, mesmo que o cron rode todo dia durante os 3 dias da janela.
// ──────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_KEY = Deno.env.get('RESEND_API_KEY')       ?? ''
const SUPA_URL   = Deno.env.get('SUPABASE_URL')         ?? ''
const SUPA_KEY   = Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''
const APP_URL    = Deno.env.get('APP_URL')              ?? 'https://vorynapp.com.br'

const db = createClient(SUPA_URL, SUPA_KEY)

// Quantos dias antes do fim do trial o aviso é disparado. Um valor só —
// a idempotência via trial_reminder_sent_at garante que, mesmo rodando o
// cron todo dia, cada pessoa só recebe isso uma vez, então não precisa de
// múltiplos limiares (ex: aviso em 3 dias E em 1 dia) para funcionar bem.
const REMINDER_DAYS_BEFORE = 3

function emailHTML(name: string, daysLeft: number) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080808;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:480px;margin:0 auto;padding:40px 24px">

  <!-- Header -->
  <div style="text-align:center;margin-bottom:36px">
    <div style="display:inline-flex;align-items:center;gap:12px;margin-bottom:12px">
      <div style="width:44px;height:44px;border-radius:12px;background:#820AD1;display:flex;align-items:center;justify-content:center">
        <span style="color:white;font-weight:900;font-size:22px;font-family:monospace">V</span>
      </div>
      <span style="color:#F2F2F7;font-size:30px;font-weight:900;letter-spacing:4px">VORYN</span>
    </div>
  </div>

  <!-- Hero -->
  <div style="background:#18181f;border:1px solid rgba(130,10,209,.35);border-radius:16px;padding:32px;margin-bottom:24px;text-align:center">
    <div style="font-size:48px;margin-bottom:16px">⏳</div>
    <h1 style="color:#F2F2F7;font-size:22px;margin:0 0 10px;font-weight:700">
      ${name}, seu trial acaba em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}
    </h1>
    <p style="color:#AEAEB2;font-size:15px;margin:0;line-height:1.6">
      Depois disso, seu acesso fica limitado — mas nenhum dado é perdido.
      Assine agora para continuar treinando sem interrupção.
    </p>
  </div>

  <!-- O que você mantém -->
  <div style="margin-bottom:24px">
    <p style="color:#636366;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px">
      Continuando com a assinatura, você mantém
    </p>
    <div style="display:flex;flex-direction:column;gap:12px">
      ${[
        ['📈', 'Histórico completo', 'Todos os treinos registrados, sem limite de dias'],
        ['🏆', 'PRs e recordes',      'Seus recordes pessoais continuam sendo acompanhados'],
        ['🎯', 'Metas e evolução',    'Gráficos de progresso e metas continuam ativos'],
      ].map(([icon, title, desc]) => `
      <div style="display:flex;gap:14px;align-items:flex-start;background:#111118;border-radius:12px;padding:14px">
        <div style="font-size:20px;flex-shrink:0">${icon}</div>
        <div>
          <p style="color:#F2F2F7;font-size:14px;font-weight:600;margin:0 0 4px">${title}</p>
          <p style="color:#636366;font-size:13px;margin:0">${desc}</p>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <!-- CTA -->
  <div style="text-align:center;margin-bottom:32px">
    <a href="${APP_URL}/app/subscription" style="display:inline-block;background:#820AD1;color:white;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;box-shadow:0 0 24px rgba(130,10,209,.4)">
      Assinar agora →
    </a>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #252530;padding-top:20px;text-align:center">
    <p style="color:#636366;font-size:12px;margin:0 0 6px">
      Voryn App
    </p>
    <p style="color:#444;font-size:11px;margin:0">
      Você recebe este email porque seu trial gratuito está terminando.<br>
      <a href="${APP_URL}/unsubscribe" style="color:#636366">Cancelar emails</a>
    </p>
  </div>
</div>
</body>
</html>`
}

serve(async (req) => {
  // Mesmo padrão de weekly-email: exige CRON_SECRET sempre presente e
  // correspondente — nunca deixa passar se o header estiver ausente.
  const authHeader = req.headers.get('Authorization')
  const expected = `Bearer ${Deno.env.get('CRON_SECRET') ?? ''}`
  if (!Deno.env.get('CRON_SECRET') || authHeader !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }

  const now = new Date()
  const windowEnd = new Date(now.getTime() + REMINDER_DAYS_BEFORE * 86400000)

  // Só quem está em trial (não assinantes já pagos), com trial terminando
  // dentro da janela, e que ainda não recebeu o aviso.
  const { data: dueSubs, error: subsErr } = await db
    .from('subscriptions')
    .select('user_id, trial_ends_at')
    .eq('status', 'trialing')
    .is('trial_reminder_sent_at', null)
    .gte('trial_ends_at', now.toISOString())
    .lte('trial_ends_at', windowEnd.toISOString())

  if (subsErr) {
    console.error('[trial-reminder-email] Falha ao buscar subscriptions:', subsErr)
    return new Response(JSON.stringify({ error: subsErr.message }), { status: 500 })
  }
  if (!dueSubs?.length) {
    return new Response(JSON.stringify({ sent: 0, failed: 0, total: 0 }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 })
  }

  const userIds = dueSubs.map(s => s.user_id)
  const { data: users } = await db
    .from('users')
    .select('id, name, email')
    .in('id', userIds)

  const usersById: Record<string, { id: string; name: string; email: string }> = {}
  for (const u of users || []) usersById[u.id] = u

  let sent = 0
  let failed = 0

  for (const sub of dueSubs) {
    const u = usersById[sub.user_id]
    if (!u?.email) { failed++; continue }

    const daysLeft = Math.max(0, Math.ceil(
      (new Date(sub.trial_ends_at).getTime() - now.getTime()) / 86400000
    ))

    let emailOk = true
    if (RESEND_KEY) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
          body: JSON.stringify({
            from:    'Voryn App <noreply@vorynapp.com.br>',
            to:      u.email,
            subject: `${u.name?.split(' ')[0] || 'Atleta'}, seu trial acaba em ${daysLeft} dia${daysLeft !== 1 ? 's' : ''} ⏳`,
            html:    emailHTML(u.name || 'Atleta', daysLeft),
          }),
        })
        emailOk = res.ok
      } catch { emailOk = false }
    } else {
      console.warn('[trial-reminder-email] RESEND_API_KEY not set — skipping email, still sending push')
    }

    // Push é best-effort: não bloqueia nem afeta o resultado do email —
    // mesmo padrão usado em weekly-email para o resumo semanal.
    try {
      await fetch(`${SUPA_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('CRON_SECRET') ?? ''}`,
        },
        body: JSON.stringify({
          mode:    'send',
          type:    'trial_ending',
          userIds: [u.id],
          data:    { daysLeft },
        }),
      })
    } catch (e) {
      console.warn(`[trial-reminder-email] Push notify failed for ${u.id} (non-critical):`, e)
    }

    if (emailOk) sent++; else failed++

    // Marca como enviado independentemente do resultado do email — se o
    // Resend falhar por um motivo pontual (rate limit, etc.), preferimos
    // não tentar de novo amanhã e possivelmente mandar duas vezes; o push
    // já cobre esse usuário de qualquer forma como canal alternativo.
    await db.from('subscriptions')
      .update({ trial_reminder_sent_at: now.toISOString() })
      .eq('user_id', u.id)
  }

  return new Response(JSON.stringify({ sent, failed, total: dueSubs.length }), {
    headers: { 'Content-Type': 'application/json' }, status: 200
  })
})
