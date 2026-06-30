// ──────────────────────────────────────────────────────────
//  Voryn — Welcome Email (disparo pós-cadastro)
//  Trigger via Supabase Database Webhook ou Edge Function
//  Env: RESEND_API_KEY, APP_URL, SUPABASE_URL, SUPABASE_ANON_KEY
//
//  SEGURANÇA: o email do destinatário é extraído do JWT da sessão
//  validada, nunca confiado a partir do corpo da requisição. Sem
//  isso, qualquer pessoa sem autenticação poderia chamar esta rota
//  publicamente exposta para mandar email "de boas-vindas ao Voryn"
//  para qualquer endereço de terceiros (abuso de cota / phishing).
// ──────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_KEY = Deno.env.get('RESEND_API_KEY')      ?? ''
const APP_URL     = Deno.env.get('APP_URL')             ?? 'https://vorynapp.com.br'
const SUPA_URL    = Deno.env.get('SUPABASE_URL')        ?? ''
const SUPA_KEY    = Deno.env.get('SUPABASE_SERVICE_KEY')?? ''
const ANON_KEY    = Deno.env.get('SUPABASE_ANON_KEY')   ?? ''

function welcomeHTML(name: string, role: string) {
  const isPersonal = role === 'personal'
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
  <div style="background:#18181f;border:1px solid #252530;border-radius:16px;padding:32px;margin-bottom:24px;text-align:center">
    <div style="font-size:48px;margin-bottom:16px">${isPersonal ? '👤' : '🏋️'}</div>
    <h1 style="color:#F2F2F7;font-size:22px;margin:0 0 10px;font-weight:700">
      Bem-vindo ao Voryn, ${name}!
    </h1>
    <p style="color:#AEAEB2;font-size:15px;margin:0;line-height:1.6">
      ${isPersonal
        ? 'Seu painel de personal trainer está pronto. Adicione seus primeiros alunos e comece a transformar vidas.'
        : 'Seu app de treino está pronto. Registre seu primeiro treino hoje e comece a construir consistência.'}
    </p>
  </div>

  <!-- Next steps -->
  <div style="margin-bottom:24px">
    <p style="color:#636366;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px">
      ${isPersonal ? 'Seus próximos passos' : 'Por onde começar'}
    </p>
    ${isPersonal ? `
    <div style="display:flex;flex-direction:column;gap:12px">
      ${[
        ['1', 'Acesse o painel de alunos', 'Vá em Alunos e copie seu link de convite único'],
        ['2', 'Convide seus alunos',       'Compartilhe o link pelo WhatsApp ou mostre o QR Code'],
        ['3', 'Crie fichas de treino',     'Monte a rotina dos alunos direto pelo app'],
      ].map(([num, title, desc]) => `
      <div style="display:flex;gap:14px;align-items:flex-start;background:#111118;border-radius:12px;padding:14px">
        <div style="width:28px;height:28px;border-radius:50%;background:#820AD1;color:white;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${num}</div>
        <div>
          <p style="color:#F2F2F7;font-size:14px;font-weight:600;margin:0 0 4px">${title}</p>
          <p style="color:#636366;font-size:13px;margin:0">${desc}</p>
        </div>
      </div>`).join('')}
    </div>` : `
    <div style="display:flex;flex-direction:column;gap:12px">
      ${[
        ['1', 'Configure sua rotina',      'Vá em Rotina e adicione os treinos de cada dia da semana'],
        ['2', 'Registre seu primeiro PR',  'Anote seus recordes pessoais atuais em Perfil'],
        ['3', 'Inicie um treino hoje',     'Pressione "Iniciar treino" e registre cada série'],
      ].map(([num, title, desc]) => `
      <div style="display:flex;gap:14px;align-items:flex-start;background:#111118;border-radius:12px;padding:14px">
        <div style="width:28px;height:28px;border-radius:50%;background:#820AD1;color:white;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${num}</div>
        <div>
          <p style="color:#F2F2F7;font-size:14px;font-weight:600;margin:0 0 4px">${title}</p>
          <p style="color:#636366;font-size:13px;margin:0">${desc}</p>
        </div>
      </div>`).join('')}
    </div>`}
  </div>

  <!-- Trial reminder -->
  <div style="background:#18181f;border:1px solid rgba(130,10,209,.3);border-radius:12px;padding:16px;margin-bottom:24px;text-align:center">
    <p style="color:#A855F7;font-size:13px;font-weight:600;margin:0 0 6px">⏱ 14 dias grátis ativados</p>
    <p style="color:#636366;font-size:12px;margin:0">Sem cartão de crédito necessário. Assine quando quiser.</p>
  </div>

  <!-- CTA -->
  <div style="text-align:center;margin-bottom:32px">
    <a href="${APP_URL}/app" style="display:inline-block;background:#820AD1;color:white;font-weight:700;font-size:15px;padding:14px 36px;border-radius:12px;text-decoration:none;box-shadow:0 0 24px rgba(130,10,209,.4)">
      Abrir o Voryn →
    </a>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #252530;padding-top:20px;text-align:center">
    <p style="color:#636366;font-size:12px;margin:0 0 6px">
      Voryn App
    </p>
    <p style="color:#444;font-size:11px;margin:0">
      Você recebe este email porque criou uma conta no Voryn.<br>
      <a href="${APP_URL}/unsubscribe" style="color:#636366">Cancelar emails</a>
    </p>
  </div>
</div>
</body>
</html>`
}

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  // ── Validar JWT e extrair email do usuário autenticado ──────
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

  // email vem do JWT validado — não do body (que nunca é confiável)
  const email = authData.user.email
  if (!email) {
    return new Response(JSON.stringify({ error: 'Email não encontrado na sessão' }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  // name e role continuam vindo do body — não são sensíveis (não concedem
  // acesso a nenhum recurso de outra pessoa, só afetam o conteúdo do email)
  let body: { name?: string; role?: string }
  try { body = await req.json() } catch { body = {} }
  const name = body.name || email.split('@')[0] || 'Atleta'
  const role = body.role || 'student'

  if (!RESEND_KEY) {
    console.warn('[welcome-email] RESEND_API_KEY not set — skipping')
    return new Response(JSON.stringify({ ok: true, skipped: true }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_KEY}` },
    body: JSON.stringify({
      from:    'Voryn App <noreply@vorynapp.com.br>',
      to:      email,
      subject: `Bem-vindo ao Voryn, ${name}! Seus 14 dias grátis começaram 💪`,
      html:    welcomeHTML(name, role),
    }),
  })

  const data = await res.json()
  return new Response(JSON.stringify({ ok: res.ok, ...data }), {
    status: res.ok ? 200 : 500,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
