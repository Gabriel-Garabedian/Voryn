import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Voryn] Supabase não configurado. Copie .env.example para .env e preencha as chaves.')
}

// BUG: createClient() valida a URL e lança uma exceção síncrona
// ("supabaseUrl is required.") quando SUPABASE_URL vem vazio — e isso
// acontece na avaliação do módulo, antes do React sequer começar a
// renderizar. Como este arquivo é importado bem cedo (via AuthContext,
// usado por toda a árvore de rotas, inclusive a LandingPage pública que
// não depende de backend nenhum), o erro derrubava o app inteiro numa
// tela preta em branco, sem nenhuma mensagem — nem o <ErrorBoundary> do
// main.jsx consegue pegar isso, porque um erro na avaliação de um módulo
// acontece antes de qualquer render (ErrorBoundary só captura erros
// durante o ciclo de vida do React). Usamos uma URL placeholder
// válida quando a de verdade está faltando, para o app conseguir montar
// e mostrar algo em vez de travar — as chamadas reais à API vão falhar
// com erro de rede, que o resto do código já trata com .catch().
export const supabase = createClient(
  SUPABASE_URL      || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key',
  {
    auth: {
      persistSession:      true,
      autoRefreshToken:    true,
      detectSessionInUrl:  true,
    }
  }
)

export async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('users')
    .select('*, subscriptions(*)')
    .eq('id', user.id)
    .single()
  return data
}
