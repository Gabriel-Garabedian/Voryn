-- ============================================================
--  VORYN SAAS — Supabase SQL Schema (consolidado / v8)
--  Execute do início ao fim no SQL Editor de um projeto novo.
--  Este arquivo é idempotente: pode ser executado mais de uma
--  vez sem gerar erro de "already exists" / "duplicate".
--
--  Substitui e consolida: schema.sql + migrations.sql + fix_rls.sql
--  Não execute mais esses três arquivos — apenas este.
-- ============================================================

-- ============================================================
--  EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto"; -- usado por algumas funções internas do Supabase

-- pg_net permite chamar Edge Functions (HTTP) a partir de triggers — usado
-- pela notificação de mensagem nova (ver notify_new_message, mais abaixo).
-- Em alguns projetos Supabase, habilitar extensões C via SQL Editor comum
-- (não-superuser) falha com "permission denied to create extension" —
-- isso aconteceria mesmo executando como o usuário "postgres" do projeto,
-- dependendo de como o projeto foi provisionado. Sem este bloco, esse erro
-- pararia a execução do schema.sql inteiro no meio, antes de chegar nas
-- tabelas, RLS e demais triggers — o que vai contra a garantia de que este
-- arquivo executa do início ao fim sem falhar. Se isso acontecer, a
-- extensão fica indisponível e a notificação de mensagem nova simplesmente
-- não é enviada (capturado depois pelo "exception when others" da própria
-- trigger) — o resto do produto continua funcionando normalmente. Para
-- habilitar de verdade nesse caso, vá ao painel do Supabase → Database →
-- Extensions → ative "pg_net" manualmente, e rode este schema de novo.
do $$
begin
  create extension if not exists "pg_net";
exception when insufficient_privilege then
  raise warning 'Sem permissão para habilitar pg_net via SQL — ative manualmente em Database > Extensions no painel do Supabase. A notificação de mensagem nova não funcionará até isso ser feito, mas o resto do schema continua normalmente.';
when others then
  raise warning 'Falha ao habilitar pg_net (%) — ative manualmente em Database > Extensions se quiser notificação de mensagem nova.', SQLERRM;
end $$;

-- ============================================================
--  TABELAS
--  (ordem respeita dependências de foreign key)
-- ============================================================

-- ── USERS ─────────────────────────────────────────────────
-- email_normalized (abaixo) detecta o truque comum de "fulano+1@gmail.com",
-- "fulano+2@gmail.com" etc — todos caem na mesma caixa de entrada real,
-- mas contam como emails diferentes para o "unique" em email, permitindo
-- criar contas novas infinitamente só para sempre ter 14 dias de trial.
-- Esta coluna guarda o email sem a parte "+algo" antes do @, gerada
-- automaticamente a cada insert/update — usada por handle_new_user() para
-- decidir se esta é de fato a primeira conta daquele email-base ou não.
create table if not exists public.users (
  id               uuid primary key references auth.users(id) on delete cascade,
  email            text not null unique,
  email_normalized text generated always as (lower(regexp_replace(email, '\+[^@]*@', '@'))) stored,
  name             text not null,
  role             text not null default 'student' check (role in ('student','personal','admin')),
  avatar_url       text,
  goal             text,
  weekly_goal      int not null default 3,
  onboarding_done  boolean not null default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists idx_users_email_normalized on public.users(email_normalized);

-- ── SUBSCRIPTIONS ─────────────────────────────────────────
create table if not exists public.subscriptions (
  id                    uuid primary key default uuid_generate_v4(),
  -- unique aqui é obrigatório: tanto este trigger (handle_new_user, no
  -- ON CONFLICT (user_id) do update abaixo) quanto a Edge Function
  -- create-preference (upsert com onConflict: 'user_id') dependem de um
  -- constraint único nesta coluna para funcionar. Sem ele, o Postgres
  -- rejeita a operação com "there is no unique or exclusion constraint
  -- matching the ON CONFLICT specification" — um erro que só aparece na
  -- prática quando o conflito de fato acontece (ex: segunda tentativa de
  -- assinatura, ou email confirmado depois do cadastro), não no primeiro
  -- insert de cada usuário, o que o torna fácil de não notar em teste
  -- manual rápido.
  user_id               uuid not null unique references public.users(id) on delete cascade,
  plan                  text not null default 'free' check (plan in ('free','student','personal','personal_pro')),
  status                text not null default 'trialing' check (status in ('active','trialing','canceled','past_due','inactive','pending')),
  trial_ends_at         timestamptz default (now() + interval '14 days'),
  -- Marca quando o email/push de "seu trial acaba em breve" foi enviado.
  -- Null = ainda não enviado. Sem isso, a Edge Function de lembrete
  -- (trial-reminder-email) precisaria confiar em "trial_ends_at está
  -- entre hoje e daqui 3 dias" sozinho — mas como o cron pode rodar mais
  -- de uma vez dentro dessa janela de 3 dias (ex: todo dia), a mesma
  -- pessoa receberia o aviso repetidas vezes. Este campo torna o envio
  -- idempotente: uma vez marcado, nunca mais reenviado, não importa
  -- quantas vezes o cron rodar.
  trial_reminder_sent_at timestamptz,
  current_period_start  timestamptz default now(),
  current_period_end    timestamptz default (now() + interval '30 days'),
  cancel_at_period_end  boolean default false,
  external_id           text,  -- Mercado Pago / Asaas subscription ID
  external_status       text,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- ── TRAINERS ──────────────────────────────────────────────
create table if not exists public.trainers (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null unique references public.users(id) on delete cascade,
  bio          text,
  specialties  text[] default '{}',
  phone        text,
  instagram    text,
  cref         text,
  max_students int default 20,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ── TRAINER ↔ STUDENT LINK ────────────────────────────────
create table if not exists public.trainer_students (
  id          uuid primary key default uuid_generate_v4(),
  trainer_id  uuid not null references public.trainers(id) on delete cascade,
  student_id  uuid not null references public.users(id) on delete cascade,
  status      text not null default 'active' check (status in ('active','inactive','pending')),
  created_at  timestamptz default now(),
  unique(trainer_id, student_id)
);

-- ── ROUTINES ──────────────────────────────────────────────
create table if not exists public.routines (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  day_index   int not null check (day_index between 0 and 6),
  name        text,
  exercises   jsonb default '[]',
  created_by  uuid references public.users(id),  -- trainer que criou (se aplicável)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id, day_index)
);

-- ── WORKOUTS (sessão ativa) ───────────────────────────────
create table if not exists public.workouts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  name        text not null,
  day_index   int,
  status      text default 'active' check (status in ('active','completed','canceled')),
  start_time  timestamptz default now(),
  end_time    timestamptz,
  duration    int,  -- segundos
  exercises   jsonb default '[]',
  created_at  timestamptz default now()
);

-- ── WORKOUT LOGS (treinos concluídos) ─────────────────────
create table if not exists public.workout_logs (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade,
  workout_id   uuid references public.workouts(id) on delete set null,
  name         text not null,
  date         date not null default current_date,
  day_index    int,
  duration     int,
  total_sets   int default 0,
  total_reps   int default 0,
  total_volume numeric default 0,  -- kg × reps somado
  exercises    jsonb default '[]',
  created_at   timestamptz default now()
);

-- ── PERSONAL RECORDS ──────────────────────────────────────
create table if not exists public.prs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  exercise    text not null,
  weight      numeric(7,2),
  reps        int default 1,
  date        date not null default current_date,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id, exercise)
);

-- ── ASSESSMENTS (avaliações físicas) ──────────────────────
create table if not exists public.assessments (
  id           uuid primary key default uuid_generate_v4(),
  student_id   uuid not null references public.users(id) on delete cascade,
  trainer_id   uuid references public.trainers(id) on delete cascade,
  date         date not null default current_date,
  weight       numeric(5,2),
  height       numeric(5,2),
  body_fat     numeric(5,2),
  muscle_mass  numeric(5,2),
  notes        text,
  measurements jsonb default '{}',
  created_at   timestamptz default now()
);

-- ── MESSAGES (chat trainer ↔ aluno) ───────────────────────
create table if not exists public.messages (
  id          uuid primary key default uuid_generate_v4(),
  trainer_id  uuid not null references public.trainers(id) on delete cascade,
  student_id  uuid not null references public.users(id) on delete cascade,
  sender_id   uuid not null references public.users(id) on delete cascade,
  content     text not null,
  read_at     timestamptz,
  created_at  timestamptz default now()
);

-- ── PROGRAMS (programas de treino trainer → aluno) ────────
create table if not exists public.programs (
  id           uuid primary key default uuid_generate_v4(),
  trainer_id   uuid not null references public.trainers(id) on delete cascade,
  student_id   uuid not null references public.users(id) on delete cascade,
  name         text not null,
  description  text,
  start_date   date,
  end_date     date,
  created_at   timestamptz default now()
);

-- ── PAYMENT EVENTS (log de webhooks) ──────────────────────
create table if not exists public.payment_events (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references public.users(id) on delete set null,
  provider     text,  -- 'mercadopago' | 'asaas'
  event_type   text,
  external_id  text,
  payload      jsonb,
  processed    boolean default false,
  received_at  timestamptz default now(),
  created_at   timestamptz default now()
);

-- ── PUSH SUBSCRIPTIONS (notificações PWA) ─────────────────
create table if not exists public.push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz default now(),
  unique(user_id, endpoint)
);

-- ── AUDIT LOGS (conformidade LGPD) ────────────────────────
create table if not exists public.audit_logs (
  id          bigserial primary key,
  user_id     uuid references public.users(id) on delete set null,
  action      text not null,  -- ex: 'login', 'data_export', 'account_delete'
  resource    text,           -- ex: 'workout_logs'
  ip_address  text,
  user_agent  text,
  created_at  timestamptz default now()
);

-- ── PROGRESS PHOTOS (fotos de progresso) ──────────────────
create table if not exists public.progress_photos (
  id          uuid primary key default uuid_generate_v4(),
  student_id  uuid not null references public.users(id) on delete cascade,
  trainer_id  uuid references public.trainers(id) on delete set null,
  photo_url   text not null,  -- path no storage (bucket privado, URL assinada gerada no client)
  caption     text,
  category    text default 'front' check (category in ('front','side','back','custom')),
  taken_at    date not null default current_date,
  created_at  timestamptz default now()
);

-- ── STUDENT GOALS (metas do aluno) ────────────────────────
create table if not exists public.student_goals (
  id               uuid primary key default uuid_generate_v4(),
  student_id       uuid not null unique references public.users(id) on delete cascade,
  target_weight    numeric(5,2),
  target_body_fat  numeric(5,2),
  weekly_sessions  int default 3,
  target_date      date,
  notes            text,
  updated_at       timestamptz default now()
);

-- ============================================================
--  ÍNDICES
-- ============================================================
create index if not exists idx_workout_logs_user_date     on public.workout_logs(user_id, date desc);
create index if not exists idx_routines_user               on public.routines(user_id);
create index if not exists idx_subscriptions_user          on public.subscriptions(user_id);

-- MIGRATION para bancos que já rodaram este schema antes desta correção:
-- "create table if not exists" acima não altera uma tabela já existente,
-- então o "unique" adicionado na definição de subscriptions.user_id não
-- tem efeito nenhum em quem já tinha rodado o schema. Este bloco aplica
-- o mesmo constraint de forma idempotente (seguro rodar de novo).
--
-- ATENÇÃO ao rodar em banco de produção já em uso: se existir mais de uma
-- linha de subscriptions para o mesmo user_id (podia acontecer antes desta
-- correção, já que nada impedia isso), o ALTER TABLE abaixo falha com erro
-- de duplicidade. Rode a query de diagnóstico comentada logo abaixo ANTES
-- de aplicar este schema, e resolva manualmente qualquer duplicata
-- encontrada (decida qual das linhas manter) antes de prosseguir:
--
--   select user_id, count(*) from public.subscriptions
--   group by user_id having count(*) > 1;
--
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_user_id_key'
      and conrelid = 'public.subscriptions'::regclass
  ) then
    alter table public.subscriptions add constraint subscriptions_user_id_key unique (user_id);
  end if;
end $$;

-- MIGRATION: mesmo caso do bloco acima — "create table if not exists" não
-- adiciona coluna nova a uma tabela já existente. Sem isso, quem já tinha
-- rodado o schema antes desta correção não teria a coluna
-- trial_reminder_sent_at, e a Edge Function trial-reminder-email falharia
-- ao tentar gravar nela.
alter table public.subscriptions add column if not exists trial_reminder_sent_at timestamptz;

create index if not exists idx_trainer_students_trainer    on public.trainer_students(trainer_id);
create index if not exists idx_trainer_students_student    on public.trainer_students(student_id);
create index if not exists idx_messages_trainer_student    on public.messages(trainer_id, student_id, created_at desc);
create index if not exists idx_assessments_student         on public.assessments(student_id, date desc);
create index if not exists idx_prs_user                    on public.prs(user_id);
create index if not exists idx_payment_events_ext          on public.payment_events(external_id);
create index if not exists idx_push_subs_user              on public.push_subscriptions(user_id);
create index if not exists idx_audit_logs_user             on public.audit_logs(user_id);
create index if not exists idx_audit_logs_created          on public.audit_logs(created_at desc);
create index if not exists idx_photos_student              on public.progress_photos(student_id, taken_at desc);
-- Sem estes dois, duas consultas de alta frequência faziam full table scan:
-- programs.student_id é lido toda vez que o aluno abre a aba "Programas"
-- (programService.getForStudent), e subscriptions.external_id é lido em
-- TODA chamada do webhook do Mercado Pago (mercadopago-webhook faz
-- .eq('external_id', subId) a cada notificação recebida) — sem índice,
-- isso piora progressivamente conforme a base de assinaturas cresce.
create index if not exists idx_programs_student             on public.programs(student_id);
create index if not exists idx_subscriptions_external_id     on public.subscriptions(external_id);
-- Acelera a query da Edge Function trial-reminder-email (roda diariamente
-- via cron, varre subscriptions à procura de trial acabando em breve).
create index if not exists idx_subscriptions_trial_ends_at   on public.subscriptions(trial_ends_at)
  where status = 'trialing' and trial_reminder_sent_at is null;

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
alter table public.users               enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.trainers            enable row level security;
alter table public.trainer_students    enable row level security;
alter table public.routines            enable row level security;
alter table public.workouts            enable row level security;
alter table public.workout_logs        enable row level security;
alter table public.prs                 enable row level security;
alter table public.assessments         enable row level security;
alter table public.messages            enable row level security;
alter table public.programs            enable row level security;
alter table public.payment_events      enable row level security;
alter table public.push_subscriptions  enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.progress_photos     enable row level security;
alter table public.student_goals       enable row level security;

-- ── Helper: checa se o usuário logado é admin sem recursão de RLS ──
-- security definer + search_path fixo evita o loop infinito que ocorre
-- quando uma policy de "users" faz "select ... from public.users" dentro
-- de si mesma.
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
end;
$$;

-- ── Helper: nome público do trainer para a tela de convite ──
-- A tela de cadastro via link de convite (/register?trainer=ID) precisa
-- mostrar o nome do personal ANTES da pessoa criar conta — ou seja,
-- precisa ser consultável por um visitante deslogado (role 'anon'). A
-- policy "users_select_own" exige auth.uid() = id, que nunca é verdade
-- para quem ainda não tem sessão — então essa busca sempre retornava
-- vazio, e o auto-vínculo após o cadastro (que dependia de já ter esse
-- dado em mãos) nunca disparava. Em vez de abrir select geral em `users`
-- para anon (exporia email e outros dados de todo mundo), esta função
-- expõe só o nome de quem é de fato personal (role='personal'), dado um
-- id — o mínimo necessário para a tela de convite funcionar.
create or replace function public.get_trainer_public_name(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_name text;
begin
  select name into v_name from public.users where id = p_user_id and role = 'personal';
  return v_name;
end;
$$;

grant execute on function public.get_trainer_public_name(uuid) to anon, authenticated;

-- Resolve o id da linha em trainers a partir do user_id do personal —
-- necessário para o fluxo de auto-vínculo por convite (RegisterPage.jsx):
-- o aluno recém-cadastrado (autenticado, mas ainda sem vínculo em
-- trainer_students) precisa descobrir o trainers.id do personal que o
-- convidou, para então criar o próprio vínculo. Antes disso era resolvido
-- com um select direto na tabela trainers, coberto pela antiga policy
-- pública "using (true)" — mas essa policy também expunha phone e
-- instagram de todos os personais para qualquer visitante não autenticado,
-- então foi removida (ver comentário acima de "trainers_own"). Esta
-- função devolve só o id (uuid), o mínimo necessário para este fluxo
-- específico, sem reabrir a exposição de dados sensíveis.
create or replace function public.get_trainer_id_by_user(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_trainer_id uuid;
begin
  select id into v_trainer_id from public.trainers where user_id = p_user_id;
  return v_trainer_id;
end;
$$;

grant execute on function public.get_trainer_id_by_user(uuid) to authenticated;
-- Não libera para anon: diferente de get_trainer_public_name (usada antes
-- do login, na tela de convite), esta função só é chamada DEPOIS do
-- cadastro, com o usuário já autenticado.

-- ── Helper: checa se o usuário logado é o trainer responsável por um aluno ──
create or replace function public.is_trainer_of(p_student_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return exists (
    select 1
    from public.trainer_students ts
    join public.trainers t on t.id = ts.trainer_id
    where ts.student_id = p_student_id
      and t.user_id = auth.uid()
  );
end;
$$;

-- ── Helper: checa se o usuário logado é o "owner" (user_id) de um trainer_id ──
create or replace function public.owns_trainer(p_trainer_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return exists (
    select 1 from public.trainers where id = p_trainer_id and user_id = auth.uid()
  );
end;
$$;

-- ── Limpa policies anteriores (de execuções antigas / scripts duplicados) ──
-- Garante estado limpo antes de recriar, sem depender de DROP POLICY IF EXISTS
-- para cada nome diferente que já existiu nas versões anteriores do schema.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ── users ─────────────────────────────────────────────────
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);

create policy "users_admin_all" on public.users
  for all using (public.is_admin());

create policy "users_trainer_see_students" on public.users
  for select using (public.is_trainer_of(id));

-- BUG CRÍTICO confirmado em teste real: a policy acima cobre só o sentido
-- "personal vê dados do aluno" — não existia o inverso. Quando o aluno
-- abria a tela "Personal" (PersonalView.jsx) e a query fazia o join
-- trainer:trainers(*, user:users(name,email)) para mostrar o nome/contato
-- do próprio personal, a parte "users" desse join era silenciosamente
-- bloqueada pela RLS — sem erro, só retornava null. O aluno via "P"
-- genérico e nome vazio no card do personal, mesmo com a query e o
-- componente estando corretos.
create policy "users_student_see_own_trainer" on public.users
  for select using (
    exists (
      select 1
      from public.trainer_students ts
      join public.trainers t on t.id = ts.trainer_id
      where t.user_id = users.id
        and ts.student_id = auth.uid()
        and ts.status = 'active'
    )
  );

-- ── subscriptions ─────────────────────────────────────────
create policy "subs_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "subs_insert_own" on public.subscriptions
  for insert with check (auth.uid() = user_id);

create policy "subs_update_own" on public.subscriptions
  for update using (auth.uid() = user_id);

create policy "subs_admin_all" on public.subscriptions
  for all using (public.is_admin());

-- ── trainers ──────────────────────────────────────────────
create policy "trainers_own" on public.trainers
  for all using (auth.uid() = user_id);

-- Alunos vinculados a um personal podem ver os dados completos dele
-- (bio, phone, instagram) dentro do app — necessário para a tela do
-- personal no app do aluno mostrar as informações de contato.
create policy "trainers_read_linked_student" on public.trainers
  for select
  using (
    auth.role() = 'authenticated' and
    exists (
      select 1 from public.trainer_students ts
      where ts.trainer_id = trainers.id
        and ts.student_id = auth.uid()
        and ts.status = 'active'
    )
  );

-- IMPORTANTE: não existe mais uma policy pública "using (true)" nesta
-- tabela. Havia uma antes ("perfis de trainer são públicos") pensada para
-- o fluxo de convite (resolver o nome do personal a partir do link, antes
-- do aluno logar) — mas RLS filtra LINHAS, não COLUNAS: "using (true)"
-- libera a linha inteira, incluindo phone e instagram, para qualquer
-- pessoa com a anon_key (que é pública, está no JS do site). Ou seja,
-- qualquer visitante conseguia listar telefone e instagram de todos os
-- personais cadastrados rodando
--   supabase.from('trainers').select('phone, instagram')
-- direto no console do navegador, sem nunca fazer login.
--
-- O fluxo de convite não precisa dessa policy: ele já usa a função
-- get_trainer_public_name (acima), que é security definer e retorna
-- só o nome (text), nunca a linha inteira — é o jeito correto de expor
-- um campo específico sem abrir a tabela toda. Confirme, antes de reativar
-- qualquer policy pública aqui, que o fluxo de convite (RegisterPage.jsx)
-- realmente só usa essa RPC e não faz select direto na tabela.

-- ── trainer_students ──────────────────────────────────────
create policy "ts_trainer" on public.trainer_students
  for all using (public.owns_trainer(trainer_id));

create policy "ts_student_read" on public.trainer_students
  for select using (auth.uid() = student_id);

create policy "ts_student_insert" on public.trainer_students
  for insert with check (auth.uid() = student_id);

-- Sem esta policy, o admin não tinha NENHUMA forma de ler trainer_students
-- — nem ts_trainer (exige ser o próprio dono daquele trainer específico)
-- nem ts_student_read (exige ser o próprio aluno) cobrem o caso de um
-- admin genérico consultando vínculos de QUALQUER trainer/aluno. Isso
-- silenciosamente fazia, por exemplo, o aviso de "X alunos serão afetados"
-- ao excluir um personal (ver AdminShell.jsx) sempre mostrar 0 — sem
-- erro, só retornando nenhuma linha — subestimando o impacto real da
-- exclusão.
create policy "ts_admin_read" on public.trainer_students
  for select using (public.is_admin());

-- ── routines ──────────────────────────────────────────────
create policy "routines_own" on public.routines
  for all using (auth.uid() = user_id);

-- BUG CRÍTICO confirmado em teste real: "routines_trainer_write" só
-- permitia auth.uid() = created_by. Isso funciona para INSERT (linha
-- nova: created_by já vem como o personal), mas falha silenciosamente
-- para UPDATE quando já existia uma linha para aquele user_id+day_index
-- criada PELO PRÓPRIO ALUNO antes (created_by = null, ou criada por outro
-- personal anterior) — RLS não dá erro nesse caso, apenas ignora a
-- atualização (0 linhas afetadas, sem nenhuma mensagem). Resultado: o
-- personal monta a ficha, parece salvar, mas o aluno nunca vê a
-- atualização porque a linha antiga nunca foi de fato sobrescrita.
-- Corrigido: agora basta ser o trainer vinculado ao aluno (is_trainer_of),
-- não depender de quem criou a linha primeiro.
create policy "routines_trainer_write" on public.routines
  for all using (public.is_trainer_of(user_id))
  with check (public.is_trainer_of(user_id));

create policy "routines_trainer_read" on public.routines
  for select using (public.is_trainer_of(user_id));

-- ── workouts ──────────────────────────────────────────────
create policy "workouts_own" on public.workouts
  for all using (auth.uid() = user_id);

-- ── workout_logs ──────────────────────────────────────────
create policy "logs_own" on public.workout_logs
  for all using (auth.uid() = user_id);

create policy "logs_trainer_read" on public.workout_logs
  for select using (public.is_trainer_of(user_id));

-- ── prs ────────────────────────────────────────────────────
create policy "prs_own" on public.prs
  for all using (auth.uid() = user_id);

create policy "prs_trainer_read" on public.prs
  for select using (public.is_trainer_of(user_id));

-- ── assessments ───────────────────────────────────────────
create policy "assess_student_read" on public.assessments
  for select using (auth.uid() = student_id);

create policy "assess_student_insert" on public.assessments
  for insert with check (auth.uid() = student_id);

create policy "assess_trainer_all" on public.assessments
  for all using (public.owns_trainer(trainer_id));

-- ── messages ──────────────────────────────────────────────
create policy "msg_participants" on public.messages
  for all using (
    auth.uid() = sender_id
    or auth.uid() = student_id
    or public.owns_trainer(trainer_id)
  );

-- ── programs ──────────────────────────────────────────────
create policy "prog_student_read" on public.programs
  for select using (auth.uid() = student_id);

create policy "prog_trainer_all" on public.programs
  for all using (public.owns_trainer(trainer_id));

-- ── payment_events: somente admin ────────────────────────
create policy "payments_admin" on public.payment_events
  for all using (public.is_admin());

-- ── push_subscriptions ────────────────────────────────────
create policy "push_own" on public.push_subscriptions
  for all using (auth.uid() = user_id);

-- ── audit_logs: somente admin ────────────────────────────
create policy "audit_admin" on public.audit_logs
  for all using (public.is_admin());

-- ── progress_photos ───────────────────────────────────────
create policy "photos_access" on public.progress_photos
  for all using (
    auth.uid() = student_id
    or public.owns_trainer(trainer_id)
  );

-- ── student_goals ─────────────────────────────────────────
create policy "goals_own" on public.student_goals
  for all using (auth.uid() = student_id);

create policy "goals_trainer_read" on public.student_goals
  for select using (public.is_trainer_of(student_id));

-- ── Acesso de leitura do admin (faltava em 9 tabelas) ──
-- Varredura sistemática encontrou: trainers, routines, workouts,
-- workout_logs, prs, assessments, messages, programs, push_subscriptions
-- e progress_photos não tinham NENHUMA policy que cobrisse um admin
-- genérico — só policies de "é o próprio dono" ou "é o trainer vinculado
-- a esse aluno específico". Isso significa que qualquer funcionalidade
-- futura de suporte/moderação no painel admin (ex: "ver a ficha de um
-- aluno para resolver um chamado") bateria nesse mesmo bug silencioso: a
-- query roda sem erro, mas sempre retorna vazio. Deliberadamente SELECT,
-- não ALL — admin pode ler para fins de suporte, mas não tem motivo
-- legítimo para escrever dados de treino/chat de terceiros diretamente.
create policy "trainers_admin_read"        on public.trainers          for select using (public.is_admin());
create policy "routines_admin_read"        on public.routines          for select using (public.is_admin());
create policy "workouts_admin_read"        on public.workouts          for select using (public.is_admin());
create policy "logs_admin_read"            on public.workout_logs      for select using (public.is_admin());
create policy "prs_admin_read"             on public.prs               for select using (public.is_admin());
create policy "assess_admin_read"          on public.assessments       for select using (public.is_admin());
create policy "msg_admin_read"             on public.messages          for select using (public.is_admin());
create policy "prog_admin_read"            on public.programs          for select using (public.is_admin());
create policy "push_admin_read"            on public.push_subscriptions for select using (public.is_admin());
create policy "photos_admin_read"          on public.progress_photos   for select using (public.is_admin());
create policy "goals_admin_read"           on public.student_goals     for select using (public.is_admin());

-- ============================================================
--  TRIGGERS
-- ============================================================

-- ── Auto-criar perfil + assinatura trial ao cadastrar no auth.users ──
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email_normalized text;
  v_already_used     boolean;
  v_trial_interval    interval;
  v_email_confirmed  boolean;
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do nothing;

  -- Antes, não havia NENHUMA barreira contra alguém criar contas novas
  -- infinitamente só para sempre ter 14 dias de trial — bastava um email
  -- novo (gratuito, 30 segundos) ou nem isso: "fulano+1@gmail.com",
  -- "fulano+2@gmail.com" etc. caem todos na mesma caixa de entrada real,
  -- mas o "unique" em users.email tratava como contas diferentes.
  --
  -- Esta checagem não bloqueia o cadastro (continuaria possível criar a
  -- conta), só nega o trial completo de 14 dias para quem já teve uma
  -- conta com o mesmo email-base antes — recebe 1 dia, suficiente para
  -- abrir o app e ver que já usou o trial, sem dar 14 dias de graça de
  -- novo. Isto não impede 100% dos abusos (alguém disposto a usar emails
  -- de domínios diferentes ainda passa por aqui), mas elimina o caso mais
  -- comum e trivial (alias "+" do Gmail).
  select email_normalized into v_email_normalized from public.users where id = new.id;

  select exists (
    select 1 from public.users
    where email_normalized = v_email_normalized and id <> new.id
  ) into v_already_used;

  -- Verificação de email obrigatória: o trial só começa quando o usuário
  -- confirma o email. Antes, o trial de 14 dias iniciava imediatamente no
  -- cadastro — qualquer email descartável (Temp Mail, Guerrilla Mail etc.)
  -- dava acesso instantâneo sem nunca verificar nada, tornando o bloqueio
  -- de alias "+" acima parcialmente ineficaz (podiam usar emails de outros
  -- domínios descartáveis).
  --
  -- Com email confirmado como requisito: emails descartáveis que não
  -- entregam a confirmação ficam com status 'inactive' até confirmar;
  -- emails reais levam segundos. O custo de criar uma conta abusiva sobe
  -- de "30 segundos + novo alias" para "precisar de uma caixa real que
  -- receba email" — elimina a grande maioria dos abusos automatizados.
  --
  -- new.email_confirmed_at é null no INSERT inicial (cadastro) e
  -- populated no UPDATE seguinte (quando o usuário clica no link).
  -- Este trigger roda em ambos os eventos (after insert e after update
  -- em auth.users), mas o on conflict do nothing garante que a linha em
  -- public.users não é duplicada — só a assinatura é afetada.
  v_email_confirmed := (new.email_confirmed_at is not null);

  insert into public.subscriptions (user_id, plan, status, trial_ends_at)
  values (
    new.id,
    case
      when coalesce(new.raw_user_meta_data->>'role', 'student') = 'personal' then 'personal'
      else 'student'
    end,
    case when v_email_confirmed then 'trialing' else 'inactive' end,
    case
      when v_email_confirmed then
        now() + (case when v_already_used then interval '1 day' else interval '14 days' end)
      else null
    end
  )
  on conflict (user_id) do update
    set
      status       = case when excluded.status = 'trialing' then 'trialing' else subscriptions.status end,
      trial_ends_at = case
        when subscriptions.status = 'inactive' and excluded.status = 'trialing'
        then excluded.trial_ends_at
        else subscriptions.trial_ends_at
      end,
      updated_at   = now()
    where subscriptions.status = 'inactive';
  -- O ON CONFLICT aqui resolve o caso onde:
  -- 1. Usuário se cadastra → insere com status='inactive' (email não confirmado)
  -- 2. Usuário confirma email → trigger roda de novo no UPDATE de auth.users
  --    → atualiza para status='trialing' com trial_ends_at calculado
  -- Sem isso, o segundo disparo do trigger faria on conflict do nothing e
  -- o usuário ficaria preso em 'inactive' para sempre mesmo após confirmar.

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.handle_new_user();

-- ── updated_at automático ──
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- CRÍTICO — Impede escalonamento de privilégios.
-- A policy "users_update_own" permite que cada usuário atualize a PRÓPRIA
-- linha (auth.uid() = id), o que é necessário para onboarding, troca de
-- meta semanal etc. Mas RLS no Postgres protege LINHAS, não COLUNAS —
-- nada na policy impede que esse mesmo update inclua role='admin'. Sem
-- esta trigger, qualquer usuário autenticado podia chamar
-- supabase.from('users').update({ role: 'admin' }).eq('id', auth.uid())
-- diretamente via API REST (sem precisar de nenhuma tela do app) e se
-- promover a admin — um ataque que não gera nenhum erro, nenhum log
-- incomum, e funciona silenciosamente.
create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Admin pode alterar role/id de qualquer linha livremente (cobre o
  -- painel admin). Para todos os outros, role e id nunca podem mudar.
  if public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'não é permitido alterar o próprio cargo (role)';
  end if;

  if new.id is distinct from old.id then
    raise exception 'não é permitido alterar o id do usuário';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_privilege_escalation on public.users;
create trigger prevent_privilege_escalation
  before update on public.users
  for each row execute function public.prevent_self_privilege_escalation();

drop trigger if exists set_subs_updated_at on public.subscriptions;
create trigger set_subs_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- CRÍTICO — Impede auto-upgrade de plano sem pagamento.
-- Mesma classe de falha da trigger anterior (prevent_self_privilege_escalation),
-- mas aqui o impacto é direto em monetização: a policy "subs_update_own"
-- permite que cada usuário atualize a PRÓPRIA assinatura (auth.uid() =
-- user_id) — necessário para o client conseguir expirar a própria
-- assinatura vencida (ver expireSubscriptionIfNeeded em AuthContext.jsx).
-- Mas RLS não restringe quais colunas mudam: sem esta trigger, qualquer
-- usuário podia chamar
--   supabase.from('subscriptions').update({ plan: 'personal_pro', status: 'active' }).eq('user_id', auth.uid())
-- diretamente via API e se conceder o plano mais caro de graça, sem nunca
-- passar pelo Mercado Pago — um ataque silencioso, sem erro, sem log
-- incomum.
--
-- O ÚNICO update legítimo feito pelo client (não-admin, não-Edge-Function)
-- é degradar para status='canceled' quando o período expira. Toda
-- elevação de plano ou reativação de status passa pelas Edge Functions
-- (create-preference, cancel-subscription, mercadopago-webhook), que usam
-- a service_role key — essa key ignora RLS e triggers de igual forma, já
-- que roda como o owner do banco, então este bloqueio não afeta o fluxo
-- real de pagamento em nada.
create or replace function public.prevent_self_subscription_upgrade()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- service_role (usado pelas Edge Functions de pagamento: create-preference,
  -- cancel-subscription, mercadopago-webhook) SEMPRE dispara triggers, mesmo
  -- que ele bypasse RLS — RLS e triggers são dois mecanismos independentes
  -- no Postgres, "bypassar RLS" não significa "ignorar triggers". Sem este
  -- bypass explícito, esta trigger bloquearia também as próprias Edge
  -- Functions legítimas de pagamento, que precisam mudar plan/status/
  -- external_id de propósito.
  --
  -- supabase_auth_admin: role interno que o próprio Supabase Auth (GoTrue)
  -- usa para gravar em auth.users quando alguém confirma o email de
  -- verdade clicando no link — diferente de service_role, é um role
  -- totalmente separado, nunca exposto a nenhum client (não dá pra alguém
  -- "se passar" por ele de fora). Faltava aqui, e isso quebrava a trigger
  -- handle_new_user (que libera o trial só após confirmar email): ela
  -- tenta atualizar subscriptions.status de 'inactive' para 'trialing',
  -- essa atualização em cascata roda como supabase_auth_admin, e sem essa
  -- exceção era bloqueada pela mesma proteção que existe pra impedir um
  -- usuário comum de mudar o próprio plano na unha — bloqueando TODO
  -- usuário real confirmando email em produção, não só em teste manual.
  if current_setting('role', true) in ('service_role', 'supabase_auth_admin') then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  -- Única transição permitida para o próprio usuário (sem ser admin ou
  -- service_role): degradar para 'canceled' (expiração natural do trial ou
  -- do período já pago). Qualquer outra mudança de status, ou qualquer
  -- mudança de plan, external_id ou current_period_end é bloqueada.
  if new.plan is distinct from old.plan then
    raise exception 'não é permitido alterar o próprio plano diretamente';
  end if;

  if new.status is distinct from old.status and new.status <> 'canceled' then
    raise exception 'não é permitido alterar o status da assinatura diretamente';
  end if;

  if new.external_id is distinct from old.external_id then
    raise exception 'não é permitido alterar external_id diretamente';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_subscription_tampering on public.subscriptions;
create trigger prevent_subscription_tampering
  before update on public.subscriptions
  for each row execute function public.prevent_self_subscription_upgrade();

drop trigger if exists set_routines_updated_at on public.routines;
create trigger set_routines_updated_at
  before update on public.routines
  for each row execute function public.set_updated_at();

drop trigger if exists set_prs_updated_at on public.prs;
create trigger set_prs_updated_at
  before update on public.prs
  for each row execute function public.set_updated_at();

drop trigger if exists set_trainers_updated_at on public.trainers;
create trigger set_trainers_updated_at
  before update on public.trainers
  for each row execute function public.set_updated_at();

-- ── Auto-criar registro em trainers quando role = 'personal' ──
create or replace function public.handle_new_trainer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'personal' then
    insert into public.trainers (user_id) values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_trainer_created on public.users;
create trigger on_trainer_created
  after insert or update of role on public.users
  for each row execute function public.handle_new_trainer();

-- ── Limite de alunos por plano (enforcement real, não só de UI) ──
-- Fonte única de verdade (dentro do banco) para o limite de alunos por
-- plano. Antes, o valor 15/50 estava hardcoded dentro da trigger E
-- recalculado de novo no client (checkStudentLimit, em services/index.js) —
-- duas implementações que precisavam ser atualizadas manualmente em
-- conjunto sempre que a regra de negócio mudasse, com risco real de uma
-- ficar desatualizada. Agora a trigger chama esta função, e o client
-- também pode chamar via RPC (get_plan_max_students) em vez de duplicar o
-- `case` em JavaScript.
create or replace function public.get_plan_max_students(p_plan text)
returns int
language sql
immutable
as $$
  select case coalesce(p_plan, 'student')
    when 'personal'     then 15
    when 'personal_pro' then 50
    else 0
  end;
$$;

-- Explícito (não depende do default do Postgres): qualquer usuário
-- autenticado pode consultar o limite de um plano — é informação pública
-- de pricing, sem dado sensível.
grant execute on function public.get_plan_max_students(text) to authenticated;

-- ── Acesso liberado por plano do personal ──
-- Mudança de modelo de negócio: o aluno passa a ter acesso ao app de
-- graça enquanto estiver vinculado a um personal com assinatura
-- active/trialing — sem precisar pagar a própria mensalidade. Se o
-- vínculo for desfeito, ou a assinatura do personal expirar/for
-- cancelada, o aluno volta a depender só da própria assinatura.
--
-- Não dá para o client checar isso direto: a RLS de subscriptions só
-- permite cada usuário ler a PRÓPRIA assinatura (auth.uid() = user_id) —
-- um aluno não pode (e não deve) ler a assinatura de terceiros, mesmo a
-- do próprio personal. Esta função, security definer, faz essa checagem
-- internamente e devolve só um booleano, sem expor nenhum dado de
-- assinatura de quem não é o próprio chamador.
create or replace function public.student_has_trainer_access(p_student_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_has_access boolean;
begin
  select exists (
    select 1
    from public.trainer_students ts
    join public.trainers t      on t.id = ts.trainer_id
    join public.subscriptions s on s.user_id = t.user_id
    where ts.student_id = p_student_id
      and ts.status = 'active'
      and s.status in ('active', 'trialing')
  ) into v_has_access;
  return coalesce(v_has_access, false);
end;
$$;

-- Só o próprio aluno (ou um admin) pode checar isso para si mesmo — não é
-- uma informação pública sobre qualquer uuid arbitrário, então NÃO
-- liberamos para anon, só authenticated. A função em si não recebe nem
-- depende de auth.uid() internamente (recebe o id por parâmetro), então
-- quem chama poderia em teoria passar o id de outra pessoa — isso só
-- revela um booleano (se aquela pessoa tem acesso via personal ou não),
-- sem nenhum dado de assinatura real exposto. Risco residual aceito por
-- ser informação de baixa sensibilidade.
grant execute on function public.student_has_trainer_access(uuid) to authenticated;

create or replace function public.enforce_trainer_student_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan         text;
  v_status       text;
  v_max_students int;
  v_active_count int;
begin
  -- Só valida quando o vínculo está (ou está virando) ativo
  if new.status <> 'active' then
    return new;
  end if;

  select s.plan, s.status into v_plan, v_status
  from public.subscriptions s
  join public.trainers t on t.user_id = s.user_id
  where t.id = new.trainer_id;

  -- Sem assinatura ativa/trialing, o plano gravado no banco não vale mais —
  -- sem isso, um trainer que parou de pagar (status 'canceled'/'past_due')
  -- mas ainda tem 'personal_pro' gravado continuava podendo vincular até 50
  -- alunos, porque a checagem antiga olhava só o nome do plano.
  if coalesce(v_status, 'inactive') not in ('active', 'trialing') then
    raise exception 'assinatura inativa — não é possível adicionar alunos';
  end if;

  v_max_students := public.get_plan_max_students(v_plan);

  if v_max_students = 0 then
    return new; -- plano sem direito a alunos (ex: 'student' sozinho) — outra
                -- policy/regra de negócio decide se isso é permitido; aqui só
                -- cuidamos do limite numérico para quem já pode ter alunos.
  end if;

  -- Lock advisory por trainer_id, liberado automaticamente ao fim da
  -- transação (pg_advisory_xact_lock). Sem isso, duas inserções simultâneas
  -- para o MESMO trainer (ex: dois alunos aceitando convite por link quase
  -- ao mesmo tempo) podem ambas ler a mesma contagem antes de qualquer uma
  -- comitar — por exemplo, ambas veem "14 de 15" e ambas passam a checagem
  -- abaixo, resultando em 16 alunos ativos para um plano de 15. hashtext()
  -- converte o uuid em um inteiro determinístico para servir de chave do
  -- lock; o risco de colisão entre dois trainer_ids diferentes existe mas é
  -- inofensivo aqui (na pior hipótese, duas operações de trainers
  -- diferentes esperam uma pela outra por uma fração de segundo, sem
  -- comprometer a integridade dos dados).
  perform pg_advisory_xact_lock(hashtext(new.trainer_id::text));

  select count(*) into v_active_count
  from public.trainer_students
  where trainer_id = new.trainer_id
    and status = 'active'
    and id is distinct from new.id;

  if v_active_count >= v_max_students then
    raise exception 'limite de alunos do plano atingido (máx. % alunos)', v_max_students;
  end if;

  return new;
end;
$$;

drop trigger if exists trainer_student_limit on public.trainer_students;
create trigger trainer_student_limit
  before insert or update of status on public.trainer_students
  for each row execute function public.enforce_trainer_student_limit();

-- ── Notificação push ao receber mensagem nova ──
-- Antes, o comentário em messageService.send() (frontend) afirmava que "a
-- notificação é gerida pelo backend" — mas nenhum trigger, webhook ou
-- chamada de Edge Function jamais existiu para isso. O template
-- 'trainer_message' já existia dentro de send-push, mas nunca era
-- invocado. O chat funcionava em tempo real DENTRO do app (via Realtime),
-- mas ninguém era avisado de uma mensagem nova se estivesse com o app
-- fechado — o que comprometia boa parte do valor do chat como canal de
-- retenção entre personal e aluno.
--
-- Lê a URL do projeto e o CRON_SECRET do Supabase Vault em vez de
-- hardcodar esses valores em texto puro no schema. Configure isso uma
-- única vez no painel do Supabase (Project → Integrations → Vault):
--   - nome 'app_url':     https://SEU-PROJETO.supabase.co
--   - nome 'cron_secret':  o mesmo valor configurado em
--                          supabase secrets set CRON_SECRET=...
create or replace function public.get_vault_secret(p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = p_name
  limit 1;
  return v_secret;
end;
$$;

-- CRÍTICO: funções security definer são chamáveis publicamente por padrão.
-- Sem este revoke explícito, qualquer usuário autenticado comum poderia
-- chamar esta função via RPC (supabase.rpc('get_vault_secret', ...)) e
-- roubar o CRON_SECRET que protege toda a infraestrutura de push
-- notifications — a mesma secret usada para autenticar chamadas à Edge
-- Function send-push. Só outras funções do banco (como
-- notify_new_message, abaixo) devem conseguir chamar isso; nunca o client.
revoke all on function public.get_vault_secret(text) from public;
revoke all on function public.get_vault_secret(text) from authenticated;
revoke all on function public.get_vault_secret(text) from anon;

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app_url     text;
  v_cron_secret text;
  v_recipient_id uuid;
  v_sender_name  text;
  v_is_trainer_sender boolean;
begin
  v_app_url     := public.get_vault_secret('app_url');
  v_cron_secret := public.get_vault_secret('cron_secret');

  -- Sem as duas secrets configuradas no Vault, não há como notificar —
  -- registra e sai sem travar o insert da mensagem (o chat em si nunca deve
  -- falhar por causa da notificação).
  if v_app_url is null or v_cron_secret is null then
    return new;
  end if;

  -- Descobre quem é o destinatário: se quem enviou foi o trainer (dono do
  -- trainer_id), o destinatário é o aluno; senão, é o personal.
  select exists (
    select 1 from public.trainers t where t.id = new.trainer_id and t.user_id = new.sender_id
  ) into v_is_trainer_sender;

  if v_is_trainer_sender then
    v_recipient_id := new.student_id;
    select name into v_sender_name from public.users where id = new.sender_id;
  else
    select t.user_id into v_recipient_id from public.trainers t where t.id = new.trainer_id;
    select name into v_sender_name from public.users where id = new.sender_id;
  end if;

  perform net.http_post(
    url     := v_app_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_cron_secret
    ),
    body := jsonb_build_object(
      'mode',    'send',
      'type',    'chat_message',
      'userIds', jsonb_build_array(v_recipient_id),
      'data',    jsonb_build_object(
        'senderName', v_sender_name,
        'preview',    new.content,
        -- Quem recebe é sempre redirecionado para a TELA DE CHAT do app
        -- onde está conversando com a outra parte: o aluno vai para
        -- /app/personal (onde fala com o personal dele); o personal vai
        -- para /app onde acessa o dashboard de alunos e abre o chat de lá.
        'url',        case when v_is_trainer_sender then '/app/personal' else '/app' end
      )
    )
  );

  return new;
exception when others then
  -- Qualquer falha na notificação (rede, Vault, etc.) nunca deve impedir o
  -- envio da mensagem em si — só registra e segue.
  raise warning 'notify_new_message falhou (não crítico): %', SQLERRM;
  return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- ============================================================
--  REALTIME (chat e treinos em tempo real)
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'workout_logs'
  ) then
    alter publication supabase_realtime add table public.workout_logs;
  end if;
end $$;

-- ============================================================
--  STORAGE
--  Bucket privado para fotos de progresso (URLs assinadas no client).
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 8388608, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set
  file_size_limit    = 8388608,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif'];

-- file_size_limit (8MB) e allowed_mime_types acima são aplicados pelo
-- próprio Supabase Storage, independente do código JS do app — antes,
-- a única validação de tipo/tamanho de arquivo existia em
-- progressPhotos.js (services), que protege contra uso normal do app mas
-- não contra alguém chamando a API de Storage diretamente. Esta é a
-- camada de defesa que não depende do client se comportar bem.
-- RLS em storage.objects é habilitado por padrão no Supabase. Sem policies
-- explícitas aqui, TODO upload/leitura/delete nesse bucket falha com erro de
-- permissão para qualquer usuário comum — só o service role conseguiria
-- acessar. O bucket era criado, mas a funcionalidade de fotos de progresso
-- nunca funcionaria de fato em produção sem isso.
--
-- O path usado pelo app é '{student_id}/{timestamp}.{ext}' (ver
-- src/services/progressPhotos.js), então (storage.foldername(name))[1] é
-- o student_id — usamos isso para restringir o acesso.
-- Cast seguro de texto para uuid: paths malformados em storage.objects (raro,
-- mas possível por upload manual ou bug futuro) não devem derrubar a policy
-- inteira com um erro de cast — apenas negar acesso a esse objeto específico.
create or replace function public.safe_uuid(p_text text)
returns uuid
language plpgsql
immutable
as $$
begin
  return p_text::uuid;
exception when others then
  return null;
end;
$$;

drop policy if exists "progress_photos_student_all" on storage.objects;
create policy "progress_photos_student_all" on storage.objects
  for all using (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- O personal pode subir/remover fotos do aluno vinculado, não só ler — a
-- tela ProgressPhotosView é usada pelo dashboard do trainer com
-- readOnly=false, ou seja, o personal de fato faz upload em nome do aluno
-- (path = '{student_id}/...', mas quem está logado é o personal). Uma
-- policy só de SELECT para o trainer deixaria o upload falhar com erro de
-- permissão sempre que fosse o personal subindo a foto.
drop policy if exists "progress_photos_trainer_read" on storage.objects;
drop policy if exists "progress_photos_trainer_all" on storage.objects;
create policy "progress_photos_trainer_all" on storage.objects
  for all using (
    bucket_id = 'progress-photos'
    and public.is_trainer_of(public.safe_uuid((storage.foldername(name))[1]))
  )
  with check (
    bucket_id = 'progress-photos'
    and public.is_trainer_of(public.safe_uuid((storage.foldername(name))[1]))
  );

-- ============================================================
--  STORAGE — Mídia de exercícios (fotos/vídeos de demonstração)
--  Bucket PÚBLICO — diferente de progress-photos (privado): esse
--  conteúdo (fotos/gifs/vídeos mostrando como executar cada exercício)
--  precisa aparecer pro aluno sem exigir URL assinada, então a leitura é
--  aberta pra qualquer um, sem autenticação.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-media', 'exercise-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']
)
on conflict (id) do update set
  public              = true,
  file_size_limit     = 52428800, -- 50MB (vídeos curtos de demonstração são maiores que fotos)
  allowed_mime_types  = array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'];

-- Leitura pública explícita via SDK (list/download), além do bucket já
-- ser público — o flag "public" no bucket libera a URL direta
-- (.../object/public/exercise-media/...), mas uma policy de select aqui
-- cobre também qualquer chamada que passe pela API normal do Storage.
drop policy if exists "exercise_media_public_read" on storage.objects;
create policy "exercise_media_public_read" on storage.objects
  for select using (bucket_id = 'exercise-media');

-- Upload/edição/remoção só por admin — o caminho pensado pra popular
-- este bucket é direto pelo painel do Supabase (Storage → exercise-media
-- → arrastar arquivos), que usa a sessão da sua própria conta Supabase,
-- não a anon_key do app — então essa restrição não te impede de fazer
-- upload por lá. Ela impede é alguém de fora, usando só a anon_key
-- pública do app (visível no JS do site), de subir ou apagar arquivos
-- nesse bucket.
drop policy if exists "exercise_media_admin_write" on storage.objects;
create policy "exercise_media_admin_write" on storage.objects
  for all using (bucket_id = 'exercise-media' and public.is_admin())
  with check (bucket_id = 'exercise-media' and public.is_admin());

-- ============================================================
--  FIM DO SCHEMA
-- ============================================================
