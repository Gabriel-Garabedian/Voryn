-- Resumos privados: nem administradores nem personal trainers recebem acesso por esta política.
create table if not exists public.health_daily_summaries (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  source text not null default 'health_connect' check (source = 'health_connect'),
  timezone text not null,
  steps bigint check (steps >= 0),
  sleep_minutes double precision check (sleep_minutes >= 0),
  nutrition_kcal double precision check (nutrition_kcal >= 0),
  water_ml double precision check (water_ml >= 0),
  weight_kg double precision check (weight_kg > 0),
  permissions text[] not null default '{}',
  synced_at timestamptz not null,
  primary key (user_id, date, source)
);
alter table public.health_daily_summaries enable row level security;
revoke all on public.health_daily_summaries from public, anon, authenticated;
grant select, insert, update, delete on public.health_daily_summaries to authenticated;
drop policy if exists "health_owner_select" on public.health_daily_summaries;
create policy "health_owner_select" on public.health_daily_summaries for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "health_owner_insert" on public.health_daily_summaries;
create policy "health_owner_insert" on public.health_daily_summaries for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "health_owner_update" on public.health_daily_summaries;
create policy "health_owner_update" on public.health_daily_summaries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "health_owner_delete" on public.health_daily_summaries;
create policy "health_owner_delete" on public.health_daily_summaries for delete to authenticated using ((select auth.uid()) = user_id);
