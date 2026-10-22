-- Reparo direcionado de perfil ausente. Execute no SQL Editor como postgres.
-- Substitua o exemplo pelo email confirmado da conta que precisa do reparo.
set voryn.repair_email = 'student@example.com';
-- Só cria o perfil ausente para este email já confirmado.
-- Perfil e assinatura são criados na mesma instrução (operação atômica).
-- Reexecutar não duplica registros nem reativa assinaturas existentes.
with restored_profile as (
  insert into public.users (id, email, name, role)
  select
    a.id,
    a.email,
    coalesce(nullif(trim(a.raw_user_meta_data->>'name'), ''), split_part(a.email, '@', 1)),
    'student'
  from auth.users a
  where lower(a.email) = lower(current_setting('voryn.repair_email'))
    and a.email_confirmed_at is not null
  on conflict (id) do nothing
  returning id, email_normalized
)
insert into public.subscriptions (user_id, plan, status, trial_ends_at)
select
  p.id,
  'student',
  'trialing',
  now() + case when exists (
    select 1 from public.users other_user
    where other_user.email_normalized = p.email_normalized
      and other_user.id <> p.id
  ) then interval '1 day' else interval '14 days' end
from restored_profile p
on conflict (user_id) do nothing;

-- Verificação após o reparo:
select u.email, u.role, u.onboarding_done, s.status, s.trial_ends_at
from public.users u
left join public.subscriptions s on s.user_id = u.id
where lower(u.email) = lower(current_setting('voryn.repair_email'));
