-- ──────────────────────────────────────────────────────────
--  Voryn — Fix: subscriptions.status não aceitava 'pending'
--
--  BUG ENCONTRADO NA AUDITORIA DE LANÇAMENTO:
--  A Edge Function create-preference grava status: 'pending' ao
--  iniciar um checkout no Mercado Pago (supabase/functions/
--  create-preference/index.ts, linha ~205). O check constraint
--  original da tabela subscriptions NÃO incluía 'pending' na
--  lista de valores permitidos — isso fazia o upsert falhar
--  silenciosamente (o erro do Postgres não era propagado pela
--  função), e o usuário era redirecionado para pagar no Mercado
--  Pago mesmo sem nenhum registro 'pending' existir no banco.
--  Quando o pagamento era confirmado, o webhook tentava localizar
--  a assinatura por external_id e não encontrava nada — a
--  assinatura paga nunca era ativada.
--
--  Esta migration adiciona 'pending' à lista de status permitidos.
--  Confirmado que nenhuma verificação de acesso no schema (RLS,
--  RPCs, triggers) trata 'pending' como status que libera acesso —
--  ele continua sendo, corretamente, um estado que NÃO concede
--  nenhum plano, apenas registra que um checkout foi iniciado.
--
--  COMO RODAR:
--  Cole este arquivo inteiro no SQL Editor do painel do Supabase
--  e execute. Seguro de rodar mesmo com o banco já em uso —
--  só altera o constraint, não apaga nem altera dados existentes.
-- ──────────────────────────────────────────────────────────

alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('active','trialing','canceled','past_due','inactive','pending'));
