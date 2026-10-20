-- Voryn — backend security hardening
-- Idempotent migration for databases that already ran schema.sql.

-- C1: signup metadata must never be able to create an admin profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_email_normalized text;
  v_already_used boolean;
  v_email_confirmed boolean;
begin
  v_role := case
    when new.raw_user_meta_data->>'role' in ('student', 'personal')
      then new.raw_user_meta_data->>'role'
    else 'student'
  end;

  insert into public.users (id, email, name, role)
  values (new.id, new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    v_role)
  on conflict (id) do nothing;

  select email_normalized into v_email_normalized
    from public.users where id = new.id;
  select exists (
    select 1 from public.users
     where email_normalized = v_email_normalized and id <> new.id
  ) into v_already_used;
  v_email_confirmed := new.email_confirmed_at is not null;

  perform set_config('voryn.bypass_sub_trigger', 'on', true);
  insert into public.subscriptions (user_id, plan, status, trial_ends_at)
  values (
    new.id,
    case when v_role = 'personal' then 'personal' else 'student' end,
    case when v_email_confirmed then 'trialing' else 'inactive' end,
    case when v_email_confirmed
      then now() + case when v_already_used then interval '1 day'
                        else interval '14 days' end
      else null end
  )
  on conflict (user_id) do update
    set status = case when excluded.status = 'trialing'
                      then 'trialing' else subscriptions.status end,
        trial_ends_at = case
          when subscriptions.status = 'inactive'
           and excluded.status = 'trialing'
            then excluded.trial_ends_at
          else subscriptions.trial_ends_at
        end,
        updated_at = now()
   where subscriptions.status = 'inactive';
  return new;
end;
$$;

-- C2: subscriptions are created only by trusted backend flows.
drop policy if exists "subs_insert_own" on public.subscriptions;

-- H4: ownership must remain true on UPDATE, not only on the old row.
drop policy if exists "communities_creator_write" on public.communities;
create policy "communities_creator_write" on public.communities
  for update using (creator_id = auth.uid())
  with check (creator_id = auth.uid());

drop policy if exists "routines_own" on public.routines;
create policy "routines_own" on public.routines
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "workouts_own" on public.workouts;
create policy "workouts_own" on public.workouts
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "logs_own" on public.workout_logs;
create policy "logs_own" on public.workout_logs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "prs_own" on public.prs;
create policy "prs_own" on public.prs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ts_trainer" on public.trainer_students;
create policy "ts_trainer" on public.trainer_students
  for all using (public.owns_trainer(trainer_id))
  with check (public.owns_trainer(trainer_id));

-- M5: webhook event deduplication. Existing null providers are normalized
-- before the unique index is created.
update public.payment_events
   set provider = coalesce(provider, 'mercadopago')
 where provider is null;
delete from public.payment_events older
 using public.payment_events newer
 where older.ctid < newer.ctid
   and older.provider = newer.provider
   and older.event_type = newer.event_type
   and older.external_id = newer.external_id
   and older.external_id is not null
   and older.external_id <> '';
alter table public.payment_events
  alter column provider set default 'mercadopago';
create unique index if not exists payment_events_provider_type_external_key
  on public.payment_events(provider, event_type, external_id)
  where external_id is not null and external_id <> '';

-- M8: append-only/internal tables must obey RLS even for their owning role.
-- Do not FORCE users/subscriptions: the auth.users trigger creates those
-- rows without an end-user JWT and must continue to work.
alter table public.payment_events force row level security;
alter table public.audit_logs force row level security;

-- M7: preserve the existing client flow's shape while preventing forged
-- creator-role rows. Joining by invite code remains exposed through the
-- existing get_community_by_invite_code RPC; direct inserts cannot create a
-- creator membership.
drop policy if exists "community_members_self_join" on public.community_members;
create policy "community_members_self_join" on public.community_members
  for insert with check (auth.uid() = user_id and role = 'member');
