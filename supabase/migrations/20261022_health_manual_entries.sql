-- REGISTROS MANUAIS DE SAÚDE — execute este bloco no banco existente.
create table if not exists public.health_manual_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null check (metric in ('steps','sleep_minutes','nutrition_kcal','water_ml','weight_kg')),
  local_date date not null,
  occurred_at timestamptz not null,
  value numeric not null check (value > 0 and value <= case metric
    when 'steps' then 200000 when 'sleep_minutes' then 1440
    when 'weight_kg' then 1000 else 30000 end),
  note text check (length(note) <= 250),
  meal text check (meal in ('Café da manhã','Almoço','Jantar','Lanche da manhã','Lanche da tarde','Lanche da noite')),
  protein_g numeric check (protein_g >= 0 and protein_g <= 5000),
  carbs_g numeric check (carbs_g >= 0 and carbs_g <= 5000),
  fat_g numeric check (fat_g >= 0 and fat_g <= 5000),
  sleep_start timestamptz,
  sleep_end timestamptz,
  created_at timestamptz not null default now(),
  check (metric not in ('steps','sleep_minutes') or value = trunc(value)),
  check (metric = 'nutrition_kcal' or (meal is null and protein_g is null and carbs_g is null and fat_g is null)),
  check ((metric = 'sleep_minutes' and sleep_start is not null and sleep_end is not null
    and sleep_end > sleep_start and sleep_end <= sleep_start + interval '24 hours'
    and abs(value - extract(epoch from (sleep_end - sleep_start)) / 60) < 1)
    or (metric <> 'sleep_minutes' and sleep_start is null and sleep_end is null))
);
create index if not exists idx_health_manual_user_date on public.health_manual_entries(user_id, local_date, occurred_at desc);
alter table public.health_manual_entries enable row level security;
revoke all on public.health_manual_entries from public, anon, authenticated;
grant select, insert, update, delete on public.health_manual_entries to authenticated;
drop policy if exists "health_manual_owner" on public.health_manual_entries;
create policy "health_manual_owner" on public.health_manual_entries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- FIM REGISTROS MANUAIS DE SAÚDE
