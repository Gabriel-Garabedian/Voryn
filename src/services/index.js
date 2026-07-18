import { supabase } from '@/lib/supabase'
import { PLANS } from '@/services/payment'
import { parseWeight, localDateKey } from '@/utils/helpers'

// ── WORKOUT LOGS ───────────────────────────────────────────
export const workoutLogService = {
  // sinceDate (opcional, formato 'YYYY-MM-DD'): quando informado, limita o
  // histórico retornado a partir dessa data. Usado para aplicar o gate de
  // PLAN_LIMITS[plan].historyDays — antes esse limite existia só como
  // número na constante de planos, mas nenhuma query de fato o aplicava;
  // o plano free podia ver o histórico completo de treinos para sempre,
  // a mesma promessa de "só 7 dias no free" nunca era cumprida na prática.
  async getAll(userId, sinceDate) {
    // Mesmo padrão defensivo de routineService.getAll — ver comentário lá
    // para o porquê. Esta é a query que alimenta o Histórico, um dos
    // fluxos mais usados do app; sem isso, abrir o Histórico offline
    // travava a tela em "carregando" para sempre.
    try {
      let query = supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (sinceDate) query = query.gte('date', sinceDate)
      const { data, error } = await query
      return { data: data || [], error }
    } catch (err) {
      console.error('[Voryn] workoutLogService.getAll falhou (rede/parse):', err)
      return { data: [], error: err }
    }
  },

  async getTrainedDates(userId) {
    // Mesmo padrão defensivo de getAll — sem isso, falha de rede aqui
    // rejeitava a Promise sem ninguém tratando, e o cálculo de "treinos
    // esta semana" no GoalsView nunca era exibido.
    try {
      const { data } = await supabase
        .from('workout_logs')
        .select('date')
        .eq('user_id', userId)
      return (data || []).map(r => r.date)
    } catch (err) {
      console.error('[Voryn] workoutLogService.getTrainedDates falhou (rede/parse):', err)
      return []
    }
  },

  async create(userId, log) {
    const exercises  = log.exercises || []
    const totalSets  = exercises.reduce((a, ex) => a + (ex.sets?.length || 0), 0)
    const totalReps  = exercises.reduce((a, ex) => a + ex.sets.reduce((s, set) => s + (parseInt(set.reps) || 0), 0), 0)
    const totalVol   = exercises.reduce((a, ex) => a + ex.sets.reduce((s, set) => s + parseWeight(set.weight) * (parseInt(set.reps) || 0), 0), 0)

    const { data, error } = await supabase
      .from('workout_logs')
      .insert({
        user_id:      userId,
        name:         log.name,
        date:         log.date,
        day_index:    log.dayIndex,
        duration:     log.duration,
        exercises:    log.exercises,
        total_sets:   totalSets,
        total_reps:   totalReps,
        total_volume: totalVol,
      })
      .select().single()
    return { data, error }
  },

  // Não aplica o gate de historyDays aqui (ver getAll acima) de propósito:
  // streak e contadores agregados são o gancho de retenção que mais
  // motiva o plano free a assinar — escondê-los do próprio usuário no
  // dia 8 sem aviso seria contraproducente. O gate de historyDays se
  // aplica ao CONTEÚDO detalhado do histórico (HistoryView/EvolutionView,
  // via getAll), não a esses números resumidos.
  async getMetrics(userId) {
    // Mesmo padrão defensivo de getAll: sem try/catch, falha de rede aqui
    // rejeitava a Promise — como o caller (ProfileView) usa .then(m => ...)
    // sem destructuring {data,error} e sem .catch(), isso passava
    // despercebido na varredura inicial de Promises sem tratamento.
    try {
      const { data } = await supabase
        .from('workout_logs')
        .select('date, duration, total_volume, total_sets')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(365)

      if (!data?.length) {
        return { total: 0, streak: 0, bestStreak: 0, weeklyCount: 0, monthlyCount: 0, avgDuration: 0, totalVolume: 0 }
      }

      const dates   = data.map(r => r.date)
      const now     = new Date()
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)
      const monAgo  = new Date(now); monAgo.setMonth(monAgo.getMonth() - 1)

      // Streak calculation
      const uniqueDates = [...new Set(dates)].sort().reverse()
      let streak = 0, bestStreak = 0, cur = 0
      let prev = localDateKey(now)
      for (const d of uniqueDates) {
        const diff = Math.round((new Date(prev) - new Date(d)) / 86400000)
        if (diff <= 1) { cur++; if (cur > bestStreak) bestStreak = cur }
        else { if (streak === 0) streak = cur; cur = 1 }
        prev = d
      }
      if (streak === 0) streak = cur

      return {
        total:        data.length,
        streak,
        bestStreak,
        weeklyCount:  data.filter(r => new Date(r.date) >= weekAgo).length,
        monthlyCount: data.filter(r => new Date(r.date) >= monAgo).length,
        avgDuration:  Math.round(data.reduce((a, r) => a + (r.duration || 0), 0) / data.length),
        totalVolume:  data.reduce((a, r) => a + (parseFloat(r.total_volume) || 0), 0),
      }
    } catch (err) {
      console.error('[Voryn] workoutLogService.getMetrics falhou (rede/parse):', err)
      return { total: 0, streak: 0, bestStreak: 0, weeklyCount: 0, monthlyCount: 0, avgDuration: 0, totalVolume: 0 }
    }
  }
}

// ── ROUTINES ───────────────────────────────────────────────
export const routineService = {
  async getAll(userId) {
    // try/catch defensivo: sem isso, uma falha de rede ou de parse (ex: o
    // app aberto offline, sem nada em cache do Service Worker) faz essa
    // Promise REJEITAR em vez de resolver com { data: null, error }. Como
    // nenhuma tela chama .catch() depois de .then(({ data }) => ...), isso
    // se torna uma "unhandled promise rejection" — a tela trava no loading
    // para sempre, sem nenhum erro visível ao usuário (o ErrorBoundary não
    // captura isso, porque ele só pega erros de render síncrono do React,
    // não rejeições de Promise fora do ciclo de render).
    try {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', userId)
      const map = {}
      ;(data || []).forEach(r => { map[r.day_index] = r })
      return { data: map, error }
    } catch (err) {
      console.error('[Voryn] routineService.getAll falhou (rede/parse):', err)
      return { data: {}, error: err }
    }
  },

  async upsert(userId, dayIndex, { name, exercises, created_by }) {
    const payload = { user_id: userId, day_index: dayIndex, name, exercises }
    // created_by é preenchido quando é o personal editando a ficha do aluno
    // (ver RoutineView em modo embedded) — usado pelas policies
    // routines_trainer_write/read no banco. Omitido (não sobrescrito com
    // null) quando o próprio aluno edita a própria rotina, para não apagar
    // um valor já existente caso o aluno edite depois do personal.
    if (created_by !== undefined) payload.created_by = created_by
    const { data, error } = await supabase
      .from('routines')
      .upsert(payload, { onConflict: 'user_id,day_index' })
      .select().single()
    return { data, error }
  },

  async delete(userId, dayIndex) {
    return supabase.from('routines')
      .delete()
      .eq('user_id', userId)
      .eq('day_index', dayIndex)
  }
}

// ── ACTIVE WORKOUT (localStorage for speed) ────────────────
export const activeWorkoutService = {
  get:   () => { try { return JSON.parse(localStorage.getItem('voryn_active') || 'null') } catch { return null } },
  save:  (w) => { try { localStorage.setItem('voryn_active', JSON.stringify(w)) } catch {} },
  clear: () => { try { localStorage.removeItem('voryn_active') } catch {} },
}

// ── PERSONAL RECORDS ───────────────────────────────────────
export const prService = {
  async getAll(userId) {
    // Mesmo padrão defensivo — ver comentário em routineService.getAll.
    try {
      const { data, error } = await supabase
        .from('prs')
        .select('*')
        .eq('user_id', userId)
      const map = {}
      ;(data || []).forEach(r => { map[r.exercise] = r })
      return { data: map, error }
    } catch (err) {
      console.error('[Voryn] prService.getAll falhou (rede/parse):', err)
      return { data: {}, error: err }
    }
  },

  async upsert(userId, exercise, weight, reps = 1) {
    const { data, error } = await supabase
      .from('prs')
      .upsert(
        { user_id: userId, exercise, weight, reps, date: localDateKey() },
        { onConflict: 'user_id,exercise' }
      )
      .select().single()
    return { data, error }
  },

  // Novo: permite remover um PR da lista (ex: aluno não treina mais
  // supino reto, prefere outra variação). Antes, a lista de exercícios
  // era fixa e hardcoded na tela (PR_MOVEMENTS em ProfileView.jsx), sem
  // nenhuma forma de adicionar ou remover.
  async delete(userId, exercise) {
    const { error } = await supabase
      .from('prs')
      .delete()
      .eq('user_id', userId)
      .eq('exercise', exercise)
    return { error }
  },
}

// ── TRAINER ────────────────────────────────────────────────
// Verifica quantos alunos ativos o trainer já tem vinculados e compara com o
// limite do plano atual da sua assinatura. Retorna um objeto de erro (para
// usar diretamente como { error }) ou null se ainda há vaga.
async function checkStudentLimit(trainerId) {
  const { data: trainer } = await supabase
    .from('trainers')
    .select('user_id')
    .eq('id', trainerId)
    .single()
  if (!trainer) return null // não deveria acontecer, mas não bloqueia por engano

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', trainer.user_id)
    .single()

  // Sem assinatura ativa/trialing, o plano gravado não vale mais — sem essa
  // checagem, um trainer com assinatura cancelada mas 'personal_pro' ainda
  // gravado no banco continuava podendo adicionar até 50 alunos.
  if (!['active', 'trialing'].includes(sub?.status)) {
    return { message: 'Sua assinatura não está ativa. Assine um plano para adicionar alunos.' }
  }

  // Lê o limite via RPC (get_plan_max_students, definida no banco) em vez de
  // duplicar o mapeamento plano→limite aqui no client. Antes, esse mesmo
  // `case` existia em dois lugares (aqui e na trigger SQL) — qualquer
  // mudança de regra de negócio feita em só um dos dois lados gerava
  // divergência silenciosa entre o que a UI permite tentar e o que o banco
  // de fato aceita.
  const { data: maxStudents, error: rpcError } = await supabase
    .rpc('get_plan_max_students', { p_plan: sub?.plan || 'student' })
  if (rpcError) {
    console.warn('[Voryn] Falha ao consultar limite de plano via RPC (não crítico):', rpcError)
    return null // não bloqueia por uma falha de rede pontual; a trigger do banco ainda protege
  }

  const { count } = await supabase
    .from('trainer_students')
    .select('id', { count: 'exact', head: true })
    .eq('trainer_id', trainerId)
    .eq('status', 'active')

  if (maxStudents > 0 && (count ?? 0) >= maxStudents) {
    return {
      message: `Você atingiu o limite de ${maxStudents} alunos do seu plano atual. Faça upgrade para adicionar mais alunos.`,
    }
  }
  return null
}

export const trainerService = {
  async getProfile(userId) {
    const { data, error } = await supabase
      .from('trainers')
      .select('*')
      .eq('user_id', userId)
      .single()
    return { data, error }
  },

  async upsert(userId, profile) {
    const { data, error } = await supabase
      .from('trainers')
      .upsert({ user_id: userId, ...profile })
      .select().single()
    return { data, error }
  },

  async getStudents(trainerId) {
    const { data, error } = await supabase
      .from('trainer_students')
      .select(`
        id,
        status,
        created_at,
        student_id,
        users!trainer_students_student_id_fkey (
          id, name, email, spotify_url
        )
      `)
      .eq('trainer_id', trainerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    // Normalizar: garantir que student está acessível como data[i].users
    return { data: data || [], error }
  },

  async addStudent(trainerId, studentEmail) {
    // 1. Buscar aluno pelo email
    const { data: student, error: findErr } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', studentEmail.toLowerCase().trim())
      .single()
    if (findErr || !student) return { error: { message: 'Aluno não encontrado. Verifique se o email está correto e se o aluno já criou sua conta.' } }

    // 2. Verificar se já está vinculado (ativo ou inativo)
    const { data: existing } = await supabase
      .from('trainer_students')
      .select('id, status')
      .eq('trainer_id', trainerId)
      .eq('student_id', student.id)
      .single()

    if (existing) {
      if (existing.status === 'active') {
        return { error: { message: `${student.name || student.email} já está vinculado ao seu painel.` } }
      }
      // Reativar vínculo inativo — também precisa respeitar o limite do plano,
      // já que reativar volta a contar como aluno ativo.
      const limitError = await checkStudentLimit(trainerId)
      if (limitError) return { error: limitError }

      const { data, error } = await supabase
        .from('trainer_students')
        .update({ status: 'active' })
        .eq('id', existing.id)
        .select().single()
      return { data, error }
    }

    // 3. Checar limite de alunos do plano atual ANTES de criar o vínculo.
    // Esta é só a camada de UX (evita o erro feio depois de preencher o
    // formulário) — a garantia real está na trigger do banco
    // (enforce_trainer_student_limit), que rejeita o insert mesmo que
    // alguém chame a API diretamente sem passar por este código.
    const limitError = await checkStudentLimit(trainerId)
    if (limitError) return { error: limitError }

    // 4. Criar novo vínculo
    const { data, error } = await supabase
      .from('trainer_students')
      .insert({ trainer_id: trainerId, student_id: student.id, status: 'active' })
      .select().single()
    if (error) {
      // A trigger do banco pode rejeitar mesmo após a checagem acima (corrida
      // entre duas adições simultâneas, ou assinatura que expirou entre a
      // checagem e o insert) — traduzimos a mensagem de erro.
      if (String(error.message || '').includes('limite de alunos')) {
        return { error: { message: error.message } }
      }
      if (String(error.message || '').includes('assinatura inativa')) {
        return { error: { message: 'Sua assinatura não está ativa. Assine um plano para adicionar alunos.' } }
      }
      return { error }
    }
    return { data, error }
  },

  async removeStudent(trainerId, studentId) {
    return supabase.from('trainer_students')
      .update({ status: 'inactive' })
      .eq('trainer_id', trainerId)
      .eq('student_id', studentId)
  }
}

// ── ASSESSMENTS ────────────────────────────────────────────
export const assessmentService = {
  async getAll(studentId) {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
      return { data: data || [], error }
    } catch (err) {
      console.error('[Voryn] assessmentService.getAll falhou (rede/parse):', err)
      return { data: [], error: err }
    }
  },

  async create(assessment) {
    const { data, error } = await supabase
      .from('assessments')
      .insert(assessment)
      .select().single()
    return { data, error }
  }
}

// ── MESSAGES ───────────────────────────────────────────────
// Schema: messages(id, trainer_id, student_id, sender_id, content, read_at, created_at)
// trainer_id → FK para trainers.id (não users.id)
// student_id → FK para users.id
// sender_id  → FK para users.id (quem enviou)
export const messageService = {
  // Busca thread entre trainer e aluno.
  // trainerId = trainers.id (UUID da tabela trainers)
  // studentId = users.id do aluno
  async getThread(trainerId, studentId) {
    // O chat é uma funcionalidade central de retenção — sem try/catch, uma
    // falha de rede aqui travava o loading do chat para sempre, tanto do
    // lado do personal (PersonalDashboardView) quanto do aluno
    // (PersonalView).
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('trainer_id', trainerId)
        .eq('student_id', studentId)
        .order('created_at', { ascending: true })
      return { data: data || [], error }
    } catch (err) {
      console.error('[Voryn] messageService.getThread falhou (rede/parse):', err)
      return { data: [], error: err }
    }
  },

  // senderId = users.id de quem está enviando
  async send(trainerId, studentId, senderId, content) {
    const { data, error } = await supabase
      .from('messages')
      .insert({ trainer_id: trainerId, student_id: studentId, sender_id: senderId, content })
      .select().single()

    // Notificação push é disparada pela trigger on_message_created no banco
    // (ver supabase/schema.sql), não por código aqui no client. Antes, este
    // comentário fazia essa mesma afirmação, mas nenhum trigger ou Edge
    // Function de fato existia para isso — o comentário estava errado e a
    // notificação nunca era enviada. Agora a trigger existe e chama
    // send-push automaticamente após cada insert em `messages`, desde que
    // os secrets 'app_url' e 'cron_secret' estejam configurados no
    // Supabase Vault (ver SETUP.md).
    return { data, error }
  },

  // Marcar mensagens como lidas
  async markRead(trainerId, studentId, readerUserId) {
    return supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('trainer_id', trainerId)
      .eq('student_id', studentId)
      .neq('sender_id', readerUserId)
      .is('read_at', null)
  },

  // Contar mensagens não lidas para o usuário atual
  async unreadCount(trainerId, studentId, readerUserId) {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('trainer_id', trainerId)
      .eq('student_id', studentId)
      .neq('sender_id', readerUserId)
      .is('read_at', null)
    return count || 0
  },

  subscribe(trainerId, studentId, callback) {
    return supabase
      .channel(`chat_${trainerId}_${studentId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages',
          filter: `trainer_id=eq.${trainerId}` },
        payload => {
          if (payload.new.student_id === studentId) callback(payload.new)
        }
      )
      .subscribe()
  }
}

// ── PROGRAMS ───────────────────────────────────────────────
export const programService = {
  async getForStudent(studentId) {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
      return { data: data || [], error }
    } catch (err) {
      console.error('[Voryn] programService.getForStudent falhou (rede/parse):', err)
      return { data: [], error: err }
    }
  },

  async create(program) {
    const { data, error } = await supabase
      .from('programs')
      .insert(program)
      .select().single()
    return { data, error }
  }
}

// ── SUBSCRIPTION ───────────────────────────────────────────
export const subscriptionService = {
  async get(userId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()
    return { data, error }
  },

  async update(userId, updates) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('user_id', userId)
      .select().single()
    return { data, error }
  }
}

// ── ADMIN ──────────────────────────────────────────────────
export const adminService = {
  async getStats() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    const [usersRes, subsRes, logsRes, recentLogsRes] = await Promise.all([
      supabase.from('users').select('id, role, created_at'),
      supabase.from('subscriptions').select('plan, status, user_id'),
      supabase.from('workout_logs').select('id', { count: 'exact', head: true }),
      // Treinos por dia dos últimos 7 dias — antes o gráfico "Treinos
      // realizados" do admin mostrava Math.random() a cada reload, como se
      // fossem dados reais (sem nenhum aviso de "simulado", diferente do
      // gráfico de novos usuários ao lado, que pelo menos avisava).
      supabase.from('workout_logs').select('date').gte('date', sevenDaysAgo),
    ])

    const users   = usersRes.data  || []
    const subs    = subsRes.data   || []
    // Antes, isto era um objeto PRICES hardcoded local — duplicado em mais
    // 4 lugares do projeto (AdminShell.jsx x3, payment.js). Foi exatamente
    // essa duplicação que causou o bug de preços desatualizados encontrado
    // em uma rodada anterior (alguns lugares tinham R$9,90/39,90/79,90,
    // outros já corrigidos para os valores reais). Consolidado para usar
    // PLANS (de services/payment.js) como única fonte.
    const active  = subs.filter(s => s.status === 'active')
    const mrr     = active.reduce((a, s) => a + (PLANS[s.plan]?.price || 0), 0)
    const now     = new Date()
    const monAgo  = new Date(now); monAgo.setMonth(monAgo.getMonth() - 1)

    // Monta os últimos 7 dias (incluindo hoje) com contagem real de novos
    // usuários e treinos por dia, no mesmo formato que os gráficos esperam
    // ({ day, novos, treinos }) — substituindo os números aleatórios.
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0)
      return d
    })
    const workoutsByDate = {}
    for (const log of (recentLogsRes.data || [])) {
      workoutsByDate[log.date] = (workoutsByDate[log.date] || 0) + 1
    }
    const chartData = last7Days.map(d => {
      const dateKey = localDateKey(d)
      const dayStart = new Date(d)
      const dayEnd   = new Date(d); dayEnd.setDate(dayEnd.getDate() + 1)
      const novos = users.filter(u => {
        const created = new Date(u.created_at)
        return created >= dayStart && created < dayEnd
      }).length
      return {
        day:     d.toLocaleDateString('pt-BR', { weekday: 'short' }),
        novos,
        treinos: workoutsByDate[dateKey] || 0,
      }
    })

    return {
      totalUsers:     users.length,
      totalStudents:  users.filter(u => u.role === 'student').length,
      totalPersonals: users.filter(u => u.role === 'personal').length,
      totalWorkouts:  logsRes.count || 0,
      activeSubs:     active.length,
      canceledSubs:   subs.filter(s => s.status === 'canceled').length,
      trialingSubs:   subs.filter(s => s.status === 'trialing').length,
      mrr:            mrr.toFixed(2),
      newThisMonth:   users.filter(u => new Date(u.created_at) >= monAgo).length,
      chartData,
    }
  },

  async getRecentUsers(limit = 50) {
    const { data } = await supabase
      .from('users')
      .select('*, subscriptions(*)')
      .order('created_at', { ascending: false })
      .limit(limit)
    return data || []
  },

  async updateUserRole(userId, role) {
    return supabase.from('users').update({ role }).eq('id', userId)
  },

  async updateSubscription(userId, updates) {
    return supabase.from('subscriptions').update(updates).eq('user_id', userId)
  },

  async deleteUser(userId) {
    // Antes, isso fazia deletes diretos em algumas tabelas públicas e nunca
    // removia de auth.users (só é possível com a service_role key, que
    // nunca pode existir no client) — o usuário "excluído" continuava
    // conseguindo fazer login normalmente. Agora delega para a Edge
    // Function delete-user, que remove de fato (dados públicos via cascade
    // + auth.users via Admin API).
    const supaUrl = import.meta.env.VITE_SUPABASE_URL
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData?.session?.access_token
    if (!accessToken) return { error: { message: 'Sessão expirada. Faça login novamente.' } }

    const res = await fetch(`${supaUrl}/functions/v1/delete-user`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body:    JSON.stringify({ userId }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return { error: { message: json.error || 'Falha ao excluir usuário' } }
    return { data: json, warning: json.warning }
  },
}

// ── TRAINER DASHBOARD STATS (agregação para visão de gestão) ──
export const trainerDashboardService = {
  /**
   * Calcula as métricas do dashboard do personal:
   * - total de alunos ativos
   * - alunos sem treinar há 7+ dias
   * - PRs novos nos últimos 7 dias (entre todos os alunos)
   * - avaliações pendentes (alunos sem avaliação nos últimos 30 dias)
   * - treinos da semana (total agregado de todos os alunos)
   * - adesão aos treinos (% de dias planejados que foram de fato treinados)
   * - ranking de consistência (alunos ordenados por streak atual)
   */
  async getStats(trainerId, studentIds) {
    if (!studentIds?.length) {
      return {
        totalStudents: 0, inactiveCount: 0, newPRsCount: 0, pendingAssessments: 0,
        weekWorkoutsCount: 0, adherenceRate: null, consistencyRanking: [],
        inactiveStudents: [], newPRs: [],
      }
    }

    const sevenDaysAgo  = new Date(Date.now() - 7  * 86400000).toISOString()
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    const sevenDaysAgoDate = sevenDaysAgo.split('T')[0]
    const sixtyDaysAgoDate = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0]

    // 1. Treinos dos últimos 60 dias de todos os alunos (uma query só, usada
    // para inatividade, treinos da semana E ranking de consistência — em vez
    // de uma query por métrica, que multiplicaria o número de round-trips
    // conforme a base de alunos crescesse).
    // Usamos a coluna 'date' (data real do treino, igual ao resto do app),
    // não 'created_at' (data de criação do registro) — perto da meia-noite
    // as duas podem divergir e classificar erradamente um aluno como inativo.
    const { data: recentLogs } = await supabase
      .from('workout_logs')
      .select('user_id, date')
      .in('user_id', studentIds)
      .gte('date', sixtyDaysAgoDate)
      .order('date', { ascending: false })

    const logsByStudent = {}
    for (const w of (recentLogs || [])) {
      (logsByStudent[w.user_id] ??= []).push(w.date)
    }

    const lastWorkoutMap = {}
    for (const sid of studentIds) {
      const dates = logsByStudent[sid]
      if (dates?.length) lastWorkoutMap[sid] = dates[0] // já vem ordenado desc
    }

    const inactiveStudentIds = studentIds.filter(sid => {
      const last = lastWorkoutMap[sid]
      return !last || last < sevenDaysAgoDate
    })

    // Treinos da semana: total agregado de todos os alunos (não por aluno).
    const weekWorkoutsCount = (recentLogs || []).filter(w => w.date >= sevenDaysAgoDate).length

    // Ranking de consistência: streak atual de cada aluno, calculado a
    // partir das mesmas 60 dias de histórico já carregados acima.
    const consistencyRanking = studentIds.map(sid => {
      const dates = [...new Set(logsByStudent[sid] || [])].sort().reverse()
      let streak = 0
      let d = new Date(); d.setHours(0, 0, 0, 0)
      for (const dateStr of dates) {
        const ld = new Date(dateStr + 'T00:00:00')
        const diff = Math.round((d.getTime() - ld.getTime()) / 86400000)
        if (diff <= 1) { streak++; d = ld } else break
      }
      return { studentId: sid, streak, workoutsLast60Days: (logsByStudent[sid] || []).length }
    }).sort((a, b) => b.streak - a.streak || b.workoutsLast60Days - a.workoutsLast60Days)

    // 2. PRs criados/atualizados nos últimos 7 dias
    const { data: recentPRs } = await supabase
      .from('prs')
      .select('user_id, exercise, weight, reps, date')
      .in('user_id', studentIds)
      .gte('date', sevenDaysAgoDate)
      .order('date', { ascending: false })

    // 3. Última avaliação de cada aluno (para detectar pendências)
    const { data: lastAssessments } = await supabase
      .from('assessments')
      .select('student_id, date')
      .in('student_id', studentIds)
      .order('date', { ascending: false })

    const lastAssessmentMap = {}
    for (const a of (lastAssessments || [])) {
      if (!lastAssessmentMap[a.student_id]) lastAssessmentMap[a.student_id] = a.date
    }

    const pendingAssessmentIds = studentIds.filter(sid => {
      const last = lastAssessmentMap[sid]
      return !last || last < thirtyDaysAgo.split('T')[0]
    })

    // 4. Adesão aos treinos: para cada aluno, compara quantos dias da
    // semana ele tem planejados na rotina (routines) com quantos ele de
    // fato treinou nos últimos 7 dias. Adesão = treinos realizados /
    // treinos planejados, em %, agregado entre todos os alunos.
    const { data: allRoutines } = await supabase
      .from('routines')
      .select('user_id, day_index')
      .in('user_id', studentIds)

    const plannedDaysByStudent = {}
    for (const r of (allRoutines || [])) {
      (plannedDaysByStudent[r.user_id] ??= new Set()).add(r.day_index)
    }

    let totalPlanned = 0
    let totalDone = 0
    for (const sid of studentIds) {
      const plannedCount = plannedDaysByStudent[sid]?.size || 0
      if (plannedCount === 0) continue // aluno sem rotina cadastrada não entra na média de adesão
      const doneCount = (logsByStudent[sid] || []).filter(d => d >= sevenDaysAgoDate).length
      totalPlanned += plannedCount
      totalDone += Math.min(doneCount, plannedCount) // não deixa "treino extra" inflar a adesão acima de 100%
    }
    const adherenceRate = totalPlanned > 0 ? Math.round((totalDone / totalPlanned) * 100) : null

    // 5. Crescimento da carteira: novos alunos vinculados por mês, últimos
    // 6 meses. Antes, o dashboard só mostrava o estado atual congelado
    // (quantos alunos tem agora) — sem nenhuma forma de o personal sentir
    // que o próprio negócio está crescendo, só números estáticos. Esse
    // gráfico é pequeno e simples de propósito: não é uma métrica de
    // "o que está errado", é uma de "como tá indo o meu negócio".
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); sixMonthsAgo.setDate(1)
    const { data: allLinks } = await supabase
      .from('trainer_students')
      .select('student_id, created_at')
      .in('student_id', studentIds)
      .gte('created_at', sixMonthsAgo.toISOString())

    const monthKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const newByMonth = {}
    for (const link of (allLinks || [])) {
      const k = monthKey(new Date(link.created_at))
      newByMonth[k] = (newByMonth[k] || 0) + 1
    }
    const growthChart = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(); d.setMonth(d.getMonth() - (5 - i)); d.setDate(1)
      return {
        month: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        novos: newByMonth[monthKey(d)] || 0,
      }
    })

    // 6. Mensagens não lidas (enviadas pelo aluno, que o trainer ainda não
    // leu), agrupadas por aluno — usada na lista de "ações prioritárias"
    // do dashboard. Antes não existia nenhuma query trazendo isso para
    // TODOS os alunos de uma vez; só havia messageService.unreadCount(),
    // que é por aluno individual.
    //
    // messages.sender_id é users.id, não trainers.id — comparar direto
    // com trainerId (que é trainers.id) nunca bateria. Buscamos o
    // user_id real do trainer primeiro.
    const { data: trainerRow } = await supabase
      .from('trainers').select('user_id').eq('id', trainerId).single()

    const unreadByStudent = {}
    if (trainerRow?.user_id) {
      const { data: unreadMsgs } = await supabase
        .from('messages')
        .select('student_id')
        .eq('trainer_id', trainerId)
        .in('student_id', studentIds)
        .neq('sender_id', trainerRow.user_id)
        .is('read_at', null)
      for (const m of (unreadMsgs || [])) {
        unreadByStudent[m.student_id] = (unreadByStudent[m.student_id] || 0) + 1
      }
    }

    return {
      totalStudents:      studentIds.length,
      inactiveCount:       inactiveStudentIds.length,
      newPRsCount:         (recentPRs || []).length,
      pendingAssessments:  pendingAssessmentIds.length,
      weekWorkoutsCount,
      adherenceRate,
      consistencyRanking,
      inactiveStudentIds,
      pendingAssessmentIds,
      newPRs:              recentPRs || [],
      lastWorkoutMap,
      lastAssessmentMap,
      growthChart,
      unreadByStudent,
    }
  },
}

// ── Comunidades ─────────────────────────────────────────────
// Só por convite (código de 8 caracteres) — nunca busca pública de
// usuários. Ver comentário no schema.sql para o porquê desse modelo.
export const communityService = {
  async getMine(userId) {
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select('community:communities(*), role')
        .eq('user_id', userId)
      if (error) throw error
      return { data: (data || []).map(r => ({ ...r.community, myRole: r.role })), error: null }
    } catch (err) {
      console.error('[Voryn] communityService.getMine falhou:', err)
      return { data: [], error: err }
    }
  },

  async create(userId, name, description) {
    const { data, error } = await supabase
      .from('communities')
      .insert({ creator_id: userId, name, description })
      .select().single()
    if (error) {
      // Antes, esse erro era engolido silenciosamente — a tela só mostrava
      // "não foi possível criar agora", sem nenhum registro do motivo real
      // (poderia ser a trigger de "só pagante cria", RLS, nome duplicado,
      // rede...). Logar aqui é o que permite descobrir a causa de verdade
      // pelo console do navegador, em vez de adivinhar.
      console.error('[Voryn] communityService.create falhou:', error)
      return { data: null, error }
    }
    // Criador entra como membro automaticamente — sem isso, quem cria o
    // grupo não conseguiria nem ver o próprio feed (RLS de leitura exige
    // ser membro).
    const { error: joinErr } = await supabase
      .from('community_members')
      .insert({ community_id: data.id, user_id: userId, role: 'creator' })
    if (joinErr) {
      console.error('[Voryn] communityService.create (auto-join) falhou:', joinErr)
      return { data: null, error: joinErr }
    }
    return { data, error: null }
  },

  async getByInviteCode(code) {
    const { data, error } = await supabase
      .rpc('get_community_by_invite_code', { p_code: code })
    return { data: data?.[0] || null, error }
  },

  async join(communityId, userId) {
    return supabase.from('community_members').insert({ community_id: communityId, user_id: userId })
  },

  async leave(communityId, userId) {
    return supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', userId)
  },

  async removeMember(communityId, userId) {
    return supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', userId)
  },

  async getMembers(communityId) {
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select('user_id, role, joined_at, user:users(id, name)')
        .eq('community_id', communityId)
      if (error) throw error
      return { data: data || [], error: null }
    } catch (err) {
      console.error('[Voryn] communityService.getMembers falhou:', err)
      return { data: [], error: err }
    }
  },

  async getPrFeed(communityId) {
    try {
      const { data, error } = await supabase.rpc('get_community_pr_feed', { p_community_id: communityId })
      if (error) throw error
      return { data: data || [], error: null }
    } catch (err) {
      console.error('[Voryn] communityService.getPrFeed falhou:', err)
      return { data: [], error: err }
    }
  },

  async getActivity(communityId) {
    try {
      const { data, error } = await supabase.rpc('get_community_activity', { p_community_id: communityId })
      if (error) throw error
      return { data: data || [], error: null }
    } catch (err) {
      console.error('[Voryn] communityService.getActivity falhou:', err)
      return { data: [], error: err }
    }
  },
}

// ── Amigos ───────────────────────────────────────────────────
// Conexão direta 1-para-1, mesmo modelo de privacidade das comunidades
// (só por link pessoal, nunca busca).
export const friendService = {
  async connect(code) {
    const { data, error } = await supabase.rpc('connect_via_friend_code', { p_code: code })
    return { data: data?.[0] || null, error }
  },

  async getMyFriends() {
    try {
      const { data, error } = await supabase.rpc('get_my_friends')
      if (error) throw error
      return { data: data || [], error: null }
    } catch (err) {
      console.error('[Voryn] friendService.getMyFriends falhou:', err)
      return { data: [], error: err }
    }
  },

  async getFriendPrs(friendId) {
    try {
      const { data, error } = await supabase.rpc('get_friend_prs', { p_friend_id: friendId })
      if (error) throw error
      return { data: data || [], error: null }
    } catch (err) {
      console.error('[Voryn] friendService.getFriendPrs falhou:', err)
      return { data: [], error: err }
    }
  },

  async removeFriend(friendId, myId) {
    // A linha pode estar em qualquer ordem (a menor uuid primeiro) — tenta
    // remover nos dois sentidos possíveis, um deles vai bater.
    return supabase.from('friend_connections').delete()
      .or(`and(user_id_a.eq.${myId},user_id_b.eq.${friendId}),and(user_id_a.eq.${friendId},user_id_b.eq.${myId})`)
  },
}
