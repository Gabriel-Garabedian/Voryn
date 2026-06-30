// ──────────────────────────────────────────────────────────
//  Voryn — Delete User (admin)
//  Remove um usuário de verdade: auth.users + todas as tabelas
//  públicas relacionadas (via cascade).
//
//  ANTES, adminService.deleteUser() (no client) deletava só de
//  algumas tabelas públicas chamando supabase.from('users').delete()
//  diretamente — isso NUNCA remove de auth.users, porque a
//  Admin API de Auth só pode ser chamada com a service_role key,
//  que nunca deve existir no client. O usuário "excluído" pelo
//  admin continuava conseguindo fazer login normalmente.
//
//  SEGURANÇA: exige que quem está chamando seja um admin (checado
//  via JWT validado, nunca confiado a partir do corpo da requisição).
//  O alvo da exclusão (targetUserId) vem do corpo da requisição,
//  mas só é executado depois de confirmar que o chamador é admin.
// ──────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPA_URL = Deno.env.get('SUPABASE_URL')         ?? ''
const SUPA_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')    ?? ''
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '')
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'Não autenticado' }),
      { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  const authClient = createClient(SUPA_URL, ANON_KEY || SUPA_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
  const { data: callerData, error: callerErr } = await authClient.auth.getUser(jwt)
  if (callerErr || !callerData?.user) {
    return new Response(JSON.stringify({ error: 'Sessão inválida ou expirada' }),
      { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  const db = createClient(SUPA_URL, SUPA_KEY)

  // Confirma que quem está chamando é de fato admin — nunca confiamos em
  // nenhum campo "isAdmin" vindo do corpo da requisição.
  const { data: callerProfile } = await db
    .from('users').select('role').eq('id', callerData.user.id).single()
  if (callerProfile?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Apenas administradores podem excluir usuários' }),
      { status: 403, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  let body: { userId?: string }
  try { body = await req.json() } catch { body = {} }
  const targetUserId = body.userId
  if (!targetUserId) {
    return new Response(JSON.stringify({ error: 'userId é obrigatório' }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  // Um admin não pode auto-excluir por essa rota (evita lockout acidental
  // sem confirmação adicional) — use o fluxo normal de conta para isso.
  if (targetUserId === callerData.user.id) {
    return new Response(JSON.stringify({ error: 'Não é possível excluir a própria conta por aqui' }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  // 1. Remove os arquivos do usuário no Storage (bucket progress-photos),
  // ANTES de apagar a linha em public.users. Antes, isso não acontecia:
  // o cascade do banco limpava a tabela progress_photos, mas os arquivos
  // físicos no bucket ficavam órfãos para sempre (acumulando custo de
  // armazenamento e mantendo dado pessoal de alguém já "excluído", o que
  // colide com a postura de conformidade LGPD declarada no projeto). A
  // ordem importa: se apagássemos o banco primeiro e isso falhasse depois,
  // perderíamos a única referência de quais arquivos pertenciam a esse
  // usuário. Convenção de path: progress-photos/{userId}/{timestamp}.{ext}
  // (ver progressPhotoService.upload), então listamos a "pasta" do userId
  // diretamente — não depende da tabela progress_photos estar íntegra.
  const { data: userFiles, error: listErr } = await db.storage
    .from('progress-photos').list(targetUserId)
  if (listErr) {
    console.error('[delete-user] Falha ao listar arquivos do storage:', listErr)
    // Não bloqueia a exclusão por isso — segue tentando remover o que
    // conseguir encontrar, e se a listagem falhou não há nada a remover.
  } else if (userFiles?.length) {
    const paths = userFiles.map(f => `${targetUserId}/${f.name}`)
    const { error: removeErr } = await db.storage.from('progress-photos').remove(paths)
    if (removeErr) {
      console.error('[delete-user] Falha ao remover arquivos do storage:', removeErr)
      // Idem: não bloqueia a exclusão da conta por isso. Um admin pode
      // limpar manualmente depois se sobrar algo; o risco residual é
      // muito menor do que nunca limpar nada, que era o comportamento
      // anterior.
    }
  }

  // 2. Remove de public.users — todas as tabelas com FK "on delete cascade"
  // para users (assessments, messages, progress_photos, student_goals,
  // programs, trainer_students, push_subscriptions, routines, workouts,
  // workout_logs, prs, subscriptions, trainers) são limpas automaticamente
  // pelo Postgres. Não é preciso deletar manualmente tabela por tabela.
  const { error: dbErr } = await db.from('users').delete().eq('id', targetUserId)
  if (dbErr) {
    return new Response(JSON.stringify({ error: `Falha ao remover dados: ${dbErr.message}` }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  // 3. Remove de auth.users — só possível com service_role, nunca do client.
  // Isso é o passo que faltava: sem ele, o login da pessoa "excluída"
  // continuava funcionando normalmente.
  const { error: authErr } = await db.auth.admin.deleteUser(targetUserId)
  if (authErr) {
    // Os dados públicos já foram removidos nesse ponto — registramos o erro
    // mas não bloqueamos a resposta, já que o efeito prático (usuário sem
    // acesso a nenhum dado do produto) já foi alcançado. Um admin pode
    // tentar de novo; deleteUser em auth.users é idempotente para ids
    // inexistentes, mas pode falhar por outros motivos pontuais (rate limit).
    console.error('[delete-user] Falha ao remover de auth.users:', authErr)
    return new Response(JSON.stringify({
      ok: true,
      warning: 'Dados removidos, mas a conta de autenticação não pôde ser excluída agora. Tente novamente em alguns minutos.',
    }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ ok: true }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } })
})
