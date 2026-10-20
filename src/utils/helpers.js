// ── Normaliza o embed de subscriptions vindo do Supabase ──────────────────
// select('*, subscriptions(*)') podia devolver subscriptions como ARRAY
// ([{...}]) ou como OBJETO ({...}), dependendo de detalhe interno do
// PostgREST: a partir da v10, uma relação embutida é detectada como
// "um-para-um" (e devolvida como objeto, não lista) sempre que a foreign
// key tem um "unique" — https://postgrest.org/en/v11/releases/v10.0.0.html
// ("A one-to-one relationship is now detected when a foreign key is
// unique."). subscriptions.user_id ganhou esse unique numa correção
// anterior (necessária para o upsert do Mercado Pago funcionar), o que
// silenciosamente mudou o formato da resposta em QUALQUER lugar do app
// que fizesse esse embed — todo código escrito como
// profile.subscriptions?.[0]?.plan assumia lista, e [0] num objeto
// sempre retorna undefined. O plano/status "sumiam" sem erro nenhum,
// mesmo com o dado certinho no banco.
// Esta função aceita os dois formatos (e null/undefined) e sempre devolve
// a linha de assinatura (ou null) — é o único jeito correto de ler esse
// campo daqui pra frente, em vez de acessar subscriptions?.[0] direto.
export function getSubscription(row) {
  const s = row?.subscriptions
  if (!s) return null
  return Array.isArray(s) ? (s[0] || null) : s
}

// ── Data local (YYYY-MM-DD) — NUNCA usar toISOString() para isso ──────────
// new Date().toISOString().split('T')[0] parece inofensivo mas converte
// para UTC antes de formatar. Como o Brasil é UTC-3, qualquer treino,
// medida corporal, PR ou foto registrados entre 21h e 23h59 (horário local)
// cai no dia seguinte em UTC — a data salva vem um dia à frente da real.
// Isso causava o calendário do Home mostrar o treino de um dia no quadrado
// errado (ex: treino feito às 22h de dia 6 aparecia marcado no dia 7), e o
// mesmo problema existia (silenciosamente) em qualquer outro lugar que
// registra "hoje" à noite: PRs, avaliações físicas, fotos de progresso e
// o cálculo de streak. Esta função extrai ano/mês/dia diretamente do
// horário LOCAL do dispositivo, sem passar por UTC em nenhum momento.
export function localDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function readStoredJson(key, fallback = null) {
  try {
    const value = localStorage.getItem(key)
    return value == null ? fallback : JSON.parse(value)
  } catch {
    return fallback
  }
}

export function localDateStart(dateKey) {
  return new Date(`${dateKey}T00:00:00`)
}

// ── Tradução de erros do Supabase para português ──────────
const ERROR_MAP = {
  'Invalid login credentials':           'Email ou senha incorretos.',
  'Email not confirmed':                 'Confirme seu email antes de entrar.',
  'User already registered':             'Este email já está cadastrado.',
  'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.',
  'Email rate limit exceeded':           'Muitas tentativas. Aguarde alguns minutos.',
  'Invalid email':                       'Email inválido.',
  'User not found':                      'Usuário não encontrado.',
  'Token has expired or is invalid':     'Link expirado. Solicite um novo.',
  'New password should be different':    'A nova senha deve ser diferente da atual.',
  'Auth session missing':                'Sessão expirada. Faça login novamente.',
  'duplicate key value violates unique constraint': 'Este registro já existe.',
  'permission denied':                   'Você não tem permissão para esta ação.',
  'JWT expired':                         'Sessão expirada. Faça login novamente.',
  'signup is disabled':                  'Cadastros temporariamente desativados.',
  'email_address_not_authorized':        'Este email não está autorizado.',
  'over_email_send_rate_limit':          'Limite de emails atingido. Tente em 1 hora.',
  'weak_password':                       'Senha muito fraca. Use letras, números e símbolos.',
}

export function translateError(error) {
  if (!error) return 'Ocorreu um erro inesperado.'
  const msg = error.message || error.error_description || String(error)
  const msgLower = msg.toLowerCase()

  for (const [key, pt] of Object.entries(ERROR_MAP)) {
    const keyLower = key.toLowerCase()
    // Aceita tanto "mensagem contém chave" quanto "chave contém mensagem"
    // para cobrir casos onde o Supabase envia versões truncadas da mensagem.
    if (msgLower.includes(keyLower) || keyLower.includes(msgLower)) return pt
  }

  // Verificações de substring para erros genéricos que não estão no mapa
  if (msgLower.includes('network') || msgLower.includes('fetch')) {
    return 'Erro de conexão. Verifique sua internet.'
  }
  if (msgLower.includes('timeout')) return 'Tempo limite excedido. Tente novamente.'
  if (msgLower.includes('rate limit') || msgLower.includes('too many')) {
    return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
  }

  // Fallback genérico em português — nunca expõe mensagem técnica em inglês ao usuário
  return 'Ocorreu um erro inesperado. Tente novamente.'
}

// ── Format helpers ─────────────────────────────────────────
export function formatDuration(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min`
  return `${s}s`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function formatWeight(kg) {
  if (!kg) return '—'
  return `${kg}kg`
}

// Converte um peso digitado pelo usuário para número, aceitando tanto
// ponto quanto vírgula como separador decimal. Os inputs de peso no app
// são type="text" com inputMode="decimal" (sem máscara) — um usuário
// brasileiro digitando "82,5" teria isso interpretado por parseFloat
// nativo como apenas "82" (interrompe no primeiro caractere não
// numérico), subestimando o volume calculado silenciosamente, sem erro.
export function parseWeight(val) {
  if (val == null || val === '') return 0
  const normalized = String(val).replace(',', '.')
  const n = parseFloat(normalized)
  return isNaN(n) ? 0 : n
}

export function formatVolume(kg) {
  if (kg == null || isNaN(kg)) return '—'
  if (kg === 0) return '0kg'
  // BUG confirmado em teste real: o limiar de 1000kg para virar tonelada
  // era baixo demais. Um treino de força normal e individual facilmente
  // passa de 1000kg de volume (ex: supino 80kg x 10 reps x 4 séries =
  // 3200kg) — isso é um número normal de "peso total movido" num único
  // treino, mas a tela de resumo pós-treino mostrava algo como "3.2t",
  // o que aparenta um valor absurdo fora de contexto para quem só
  // terminou um treino. A conversão para tonelada só faz sentido para
  // acumulados de longo prazo (ex: "você moveu 50t este mês" em
  // EvolutionView) — para isso, o limiar correto é bem mais alto.
  if (kg >= 10000) return `${(kg/1000).toFixed(1)}t`
  return `${Math.round(kg).toLocaleString('pt-BR')}kg`
}

export function estimateOneRepMax(weight, reps) {
  const load = parseWeight(weight)
  const count = Number.parseInt(reps, 10) || 0
  if (load <= 0 || count <= 0) return 0
  if (count === 1) return load
  return Math.round(load * (1 + count / 30) * 10) / 10
}

export function getRecoverySnapshot(logs = [], now = new Date(), days = 4) {
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - days)
  const muscles = {}
  const sessions = (logs || []).filter(log => new Date(`${log.date}T12:00:00`) >= cutoff)

  sessions.forEach(log => {
    const ageDays = Math.max(0, (now - new Date(`${log.date}T12:00:00`)) / 86400000)
    const freshness = Math.max(0.25, 1 - ageDays / (days + 1))
    ;(log.exercises || []).forEach(exercise => {
      const muscle = exercise.muscle || exercise.target || 'Geral'
      const sets = (exercise.sets || []).filter(set => set.done !== false)
      if (!muscles[muscle]) muscles[muscle] = { muscle, sets: 0, volume: 0, freshness: 0 }
      muscles[muscle].sets += sets.length
      muscles[muscle].volume += sets.reduce((total, set) => (
        total + parseWeight(set.weight) * (Number.parseInt(set.reps, 10) || 0)
      ), 0)
      muscles[muscle].freshness = Math.max(muscles[muscle].freshness, freshness)
    })
  })

  return Object.values(muscles)
    .map(item => ({
      ...item,
      readiness: Math.round((1 - item.freshness) * 100),
      status: item.freshness >= 0.75 ? 'recuperando' : item.freshness >= 0.45 ? 'quase pronto' : 'pronto',
    }))
    .sort((a, b) => b.freshness - a.freshness || b.volume - a.volume)
}

export function getRoutineDates(routines, fromDate, toDate = new Date()) {
  if (!routines || !fromDate) return []
  const dates = []
  const cursor = new Date(fromDate)
  cursor.setHours(12, 0, 0, 0)
  const end = new Date(toDate)
  end.setHours(12, 0, 0, 0)
  while (cursor <= end) {
    const plan = routines[cursor.getDay()]
    if (plan?.exercises?.length) dates.push(localDateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

export function calcStreak(dates, eligibleDates) {
  if (!dates?.length) return 0
  const trained = new Set(dates)
  const eligible = eligibleDates ? new Set(eligibleDates) : null
  const today  = localDateKey()
  let streak = 0
  const cursor = new Date(today + 'T12:00:00')
  const oldestEligible = eligible ? [...eligible].sort()[0] : null
  for (let daysChecked = 0; daysChecked < 3661; daysChecked++) {
    const date = localDateKey(cursor)
    if (oldestEligible && date < oldestEligible) break
    if (eligible && !eligible.has(date)) {
      cursor.setDate(cursor.getDate() - 1)
      continue
    }
    if (!trained.has(date)) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function calcBestStreak(dates, eligibleDates) {
  if (!dates?.length) return 0
  const sorted = [...new Set(dates)].sort()
  const eligible = eligibleDates ? new Set(eligibleDates) : null
  let best = 1, cur = 1
  for (let i = 1; i < sorted.length; i++) {
    if (!eligible) {
      const diff = Math.round((localDateStart(sorted[i]) - localDateStart(sorted[i-1])) / 86400000)
      if (diff === 1) { cur++; if (cur > best) best = cur }
      else cur = 1
      continue
    }
    const cursor = new Date(sorted[i-1] + 'T12:00:00')
    const end = new Date(sorted[i] + 'T12:00:00')
    let validGap = true
    cursor.setDate(cursor.getDate() + 1)
    while (cursor < end) {
      if (eligible && eligible.has(localDateKey(cursor))) { validGap = false; break }
      cursor.setDate(cursor.getDate() + 1)
    }
    if (validGap) { cur++; if (cur > best) best = cur }
    else cur = 1
  }
  return best
}

// ── Plan feature gates ─────────────────────────────────────
export const PLAN_LIMITS = {
  free:         { historyDays: 7,   students: 0,  hasGraphs: false, hasPRs: false, hasGoals: false },
  student:      { historyDays: 365, students: 0,  hasGraphs: true,  hasPRs: true,  hasGoals: true  },
  personal:     { historyDays: 365, students: 15, hasGraphs: true,  hasPRs: true,  hasGoals: true  },
  personal_pro: { historyDays: 365, students: 50, hasGraphs: true,  hasPRs: true,  hasGoals: true  },
}

export function getPlanLimit(plan, key) {
  return PLAN_LIMITS[plan]?.[key] ?? PLAN_LIMITS.free[key]
}
