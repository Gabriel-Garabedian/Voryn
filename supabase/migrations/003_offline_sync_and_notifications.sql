-- Idempotência para treinos concluídos offline.
alter table public.workout_logs
  add column if not exists client_id text;

create unique index if not exists workout_logs_user_client_id
  on public.workout_logs(user_id, client_id);

-- Caixa persistente para avisos importantes do personal e do sistema.
create table if not exists public.notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text not null,
  payload     jsonb default '{}',
  read_at     timestamptz,
  created_at  timestamptz default now()
);

alter table public.notifications enable row level security;

drop policy if exists notifications_own_read on public.notifications;
create policy notifications_own_read on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists notifications_own_update on public.notifications;
create policy notifications_own_update on public.notifications
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists notifications_user_created
  on public.notifications(user_id, created_at desc);

create or replace function public.notify_routine_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid;
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    return new;
  end if;

  select ts.student_id
    into v_student
    from public.trainer_students ts
    join public.trainers t on t.id = ts.trainer_id
   where t.user_id = v_actor
     and ts.student_id = new.user_id
     and ts.status = 'active'
   limit 1;

  if v_student is not null then
    insert into public.notifications(user_id, type, title, body, payload)
    values (
      v_student,
      'routine_updated',
      'Sua ficha foi atualizada',
      coalesce(new.name, 'Seu treino') || ' recebeu uma atualização do seu personal.',
      jsonb_build_object('routine_id', new.id, 'day_index', new.day_index)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists routine_change_notification on public.routines;
create trigger routine_change_notification
  after insert or update of name, exercises, created_by on public.routines
  for each row execute function public.notify_routine_change();
