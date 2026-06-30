// ──────────────────────────────────────────────────────────
//  Voryn — Weekly Summary Email
//  Schedule: every Monday 08:00 BRT
//  Deploy: supabase functions deploy weekly-email
//  Cron:   0 11 * * 1  (11 UTC = 08 BRT)
//  Env:    RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY
// ──────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_KEY = Deno.env.get('RESEND_API_KEY')    ?? ''
const SUPA_URL   = Deno.env.get('SUPABASE_URL')      ?? ''
const SUPA_KEY   = Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''

const db = createClient(SUPA_URL, SUPA_KEY)

function emailHTML(name: string, stats: Record<string, unknown>) {
  const { weekCount, totalVolume, streak, bestPR, newPRs } = stats as {
    weekCount: number; totalVolume: number; streak: number;
    bestPR: string; newPRs: number
  }
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Seu resumo da semana — Voryn</title></head>
<body style="margin:0;padding:0;background:#080808;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:40px;height:40px;border-radius:12px;background:#820AD1;display:flex;align-items:center;justify-content:center">
          <span style="color:white;font-weight:900;font-size:20px">V</span>
        </div>
        <span style="color:#F2F2F7;font-size:28px;font-weight:900;letter-spacing:4px">VORYN</span>
      </div>
      <p style="color:#636366;font-size:13px;margin:0">Resumo Semanal</p>
    </div>

    <!-- Greeting -->
    <h1 style="color:#F2F2F7;font-size:22px;margin:0 0 8px">Olá, ${name}! 💪</h1>
    <p style="color:#AEAEB2;font-size:15px;margin:0 0 28px;line-height:1.5">
      Aqui está um resumo da sua semana de treinos.
    </p>

    <!-- Stats Grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px">
      ${[
        ['Treinos', weekCount, '🏋️'],
        ['Streak', `${streak} dias`, '🔥'],
        ['Volume', totalVolume > 0 ? `${(totalVolume/1000).toFixed(1)}t` : '—', '⚡'],
        ['PRs novos', newPRs, '🏆'],
      ].map(([label, value, icon]) => `
        <div style="background:#18181f;border:1px solid #252530;border-radius:14px;padding:16px;text-align:center">
          <div style="font-size:22px;margin-bottom:4px">${icon}</div>
          <div style="color:#820AD1;font-size:24px;font-weight:900;font-family:monospace">${value}</div>
          <div style="color:#636366;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-top:4px">${label}</div>
        </div>
      `).join('')}
    </div>

    ${weekCount === 0 ? `
    <!-- No workouts nudge -->
    <div style="background:#18181f;border:1px solid #820AD1;border-radius:14px;padding:20px;margin-bottom:24px;text-align:center">
      <p style="color:#F2F2F7;font-size:16px;font-weight:600;margin:0 0 8px">Você não treinou semana passada 😴</p>
      <p style="color:#636366;font-size:14px;margin:0 0 16px">Mas hoje é um novo começo. Que tal começar agora?</p>
      <a href="https://vorynapp.com.br/app" style="display:inline-block;background:#820AD1;color:white;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none">
        Abrir o Voryn →
      </a>
    </div>
    ` : `
    <!-- Motivation -->
    <div style="background:#18181f;border:1px solid #252530;border-radius:14px;padding:20px;margin-bottom:24px">
      <p style="color:#F2F2F7;font-size:15px;margin:0 0 12px">
        ${weekCount >= 4 ? '🔥 Semana incrível! Você está no top dos usuários mais consistentes.' :
          weekCount >= 2 ? '💪 Boa semana! Mantendo a consistência.' :
          '📈 Todo treino conta. Continue!'}
      </p>
      ${bestPR ? `<p style="color:#AEAEB2;font-size:14px;margin:0">PR da semana: <strong style="color:#820AD1">${bestPR}</strong></p>` : ''}
    </div>
    `}

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px">
      <a href="https://vorynapp.com.br/app" style="display:inline-block;background:#820AD1;color:white;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;box-shadow:0 0 24px rgba(130,10,209,.4)">
        Ver minha evolução →
      </a>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #252530;padding-top:20px;text-align:center">
      <p style="color:#636366;font-size:12px;margin:0 0 8px">
        Voryn App · Seu parceiro de treino
      </p>
      <p style="color:#444;font-size:11px;margin:0">
        Você recebe este email porque tem uma conta no Voryn.<br>
        <a href="https://vorynapp.com.br/unsubscribe" style="color:#636366">Cancelar emails semanais</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

serve(async (req) => {
  // Exige sempre o CRON_SECRET — a versão anterior só rejeitava quando o header
  // EXISTIA e era diferente do esperado; se o header estivesse ausente, a
  // checagem (authHeader && ...) era falsy e deixava passar sem autenticação
  // nenhuma, permitindo qualquer pessoa disparar emails em massa pra toda a base.
  const authHeader = req.headers.get('Authorization')
  const expected = `Bearer ${Deno.env.get('CRON_SECRET') ?? ''}`
  if (!Deno.env.get('CRON_SECRET') || authHeader !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }

  const oneWeekAgo  = new Date(Date.now() - 7 * 86400000).toISOString()

  // Buscar primeiro as assinaturas ativas/trialing e depois os usuários
  // correspondentes. Filtrar por `.in('subscriptions.status', [...])` numa
  // relação aninhada do PostgREST NÃO filtra a linha principal — só filtraria
  // os objetos dentro do array aninhado, então a query anterior na prática
  // devolvia todo mundo (incluindo cancelados/inativos), e ainda corria o
  // risco de não bater porque a sintaxe correta de filtro em relação
  // aninhada é diferente desta.
  const { data: activeSubs } = await db
    .from('subscriptions')
    .select('user_id')
    .in('status', ['active', 'trialing'])

  const activeUserIds = [...new Set((activeSubs || []).map(s => s.user_id))]
  if (!activeUserIds.length) return new Response('No users', { status: 200 })

  const { data: users } = await db
    .from('users')
    .select('id, name, email')
    .in('id', activeUserIds)

  if (!users?.length) return new Response('No users', { status: 200 })

  const validUsers = users.filter(u => u.email)
  const allIds = validUsers.map(u => u.id)

  // ── Batch real: 2 queries totais para TODOS os usuários, em vez de 4
  // queries por usuário dentro de um loop. Com algumas centenas de usuários
  // ativos, a versão anterior (loop sequencial de awaits) corria risco real
  // de ultrapassar o tempo máximo de execução da Edge Function antes de
  // terminar — essa era a limitação de escala mais séria do projeto.
  //
  // 1) Busca os últimos 60 dias de treino de TODOS os usuários de uma vez
  //    (cobre tanto "treinos da semana" quanto "streak", que olha até 60
  //    dias pra trás) e agrega em memória por user_id.
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10)
  const { data: allLogs } = await db
    .from('workout_logs')
    .select('user_id, date, total_volume')
    .in('user_id', allIds)
    .gte('date', sixtyDaysAgo)
    .order('date', { ascending: false })

  // 2) Busca todos os PRs novos da semana de todos os usuários de uma vez.
  const { data: allNewPRs } = await db
    .from('prs')
    .select('user_id')
    .in('user_id', allIds)
    .gte('created_at', oneWeekAgo)

  const logsByUser: Record<string, { date: string; total_volume: number }[]> = {}
  for (const log of allLogs || []) {
    (logsByUser[log.user_id] ??= []).push(log)
  }
  const prCountByUser: Record<string, number> = {}
  for (const pr of allNewPRs || []) {
    prCountByUser[pr.user_id] = (prCountByUser[pr.user_id] || 0) + 1
  }

  const oneWeekAgoDate = oneWeekAgo.slice(0, 10)

  function computeStats(userId: string) {
    const logs = logsByUser[userId] || []
    const weekLogs = logs.filter(l => l.date >= oneWeekAgoDate)
    const weekCount = weekLogs.length
    const totalVolume = weekLogs.reduce((a, l) => a + (l.total_volume || 0), 0)

    // Streak a partir das datas já carregadas (até 60 dias) — sem query extra.
    const dates = [...new Set(logs.map(l => l.date).filter(Boolean))].sort().reverse()
    let streak = 0
    let d = new Date(); d.setHours(0, 0, 0, 0)
    for (const dateStr of dates) {
      const ld = new Date(dateStr + 'T00:00:00')
      const diff = Math.round((d.getTime() - ld.getTime()) / 86400000)
      if (diff <= 1) { streak++; d = ld } else break
    }

    return { weekCount, totalVolume, streak, newPRs: prCountByUser[userId] || 0, bestPR: null }
  }

  let sent = 0; let failed = 0
  const userWeekCounts: Record<string, number> = {}

  // Emails ainda são enviados um a um (a API do Resend não tem endpoint de
  // batch simples para HTML por destinatário), mas agora isso é a ÚNICA
  // chamada de rede por usuário no loop principal — antes eram 4 queries +
  // 1 fetch de email por usuário.
  for (const u of validUsers) {
    const stats = computeStats(u.id)
    userWeekCounts[u.id] = stats.weekCount

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from: 'Voryn App <noreply@vorynapp.com.br>',
          to:   u.email,
          subject: `${u.name?.split(' ')[0] || 'Atleta'}, ${stats.weekCount === 0 ? 'vamos treinar essa semana?' : `você fez ${stats.weekCount} treino${stats.weekCount !== 1 ? 's' : ''} semana passada 💪`}`,
          html: emailHTML(u.name || 'Atleta', stats),
        })
      })
      if (res.ok) sent++ ; else failed++
    } catch { failed++ }
  }

  // Push notifications individuais com o resumo semanal REAL de cada usuário.
  for (const u of validUsers) {
    const userWeekCount = userWeekCounts[u.id] ?? 0
    try {
      await fetch(`${SUPA_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('CRON_SECRET') ?? ''}`,
        },
        body: JSON.stringify({
          mode:    'send',
          type:    'weekly_summary',
          userIds: [u.id],
          data:    { workouts: userWeekCount, volume: null },
        }),
      })
    } catch (e) { console.warn(`[weekly-email] Push notify failed for ${u.id} (non-critical):`, e) }
  }

  return new Response(JSON.stringify({ sent, failed, total: users.length }), {
    headers: { 'Content-Type': 'application/json' }, status: 200
  })
})
