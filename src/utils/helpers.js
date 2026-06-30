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
  if (!kg || kg === 0) return '0kg'
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

export function calcStreak(dates) {
  if (!dates?.length) return 0
  const sorted = [...new Set(dates)].sort().reverse()
  const today  = new Date().toISOString().split('T')[0]
  let streak = 0
  let prev   = today
  for (const d of sorted) {
    const diff = Math.round((new Date(prev) - new Date(d)) / 86400000)
    if (diff <= 1) { streak++; prev = d }
    else break
  }
  return streak
}

export function calcBestStreak(dates) {
  if (!dates?.length) return 0
  const sorted = [...new Set(dates)].sort()
  let best = 1, cur = 1
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round((new Date(sorted[i]) - new Date(sorted[i-1])) / 86400000)
    if (diff === 1) { cur++; if (cur > best) best = cur }
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
