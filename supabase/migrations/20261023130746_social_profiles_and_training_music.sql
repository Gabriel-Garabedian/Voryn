-- Identidade social: somente nome e foto de contatos/grupos autorizados.
begin;

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.social_profiles(p_ids uuid[])
returns table(id uuid, name text, avatar_url text)
language sql stable security definer set search_path = ''
as $$
  select u.id, u.name, u.avatar_url from public.users u
  where (select auth.uid()) is not null
    and u.id = any(p_ids)
    and (
      u.id = (select auth.uid())
      or exists (
        select 1 from public.friend_connections f
        where (f.user_id_a = (select auth.uid()) and f.user_id_b = u.id)
           or (f.user_id_b = (select auth.uid()) and f.user_id_a = u.id)
      )
      or exists (
        select 1 from public.community_members mine
        join public.community_members theirs on theirs.community_id = mine.community_id
        where mine.user_id = (select auth.uid()) and theirs.user_id = u.id
      )
      -- Mensagens antigas continuam identificadas depois da saída do autor.
      or exists (
        select 1 from public.community_members mine
        join public.community_messages msg on msg.community_id = mine.community_id
        where mine.user_id = (select auth.uid()) and msg.user_id = u.id
      )
    );
$$;
revoke all on function private.social_profiles(uuid[]) from public, anon;
grant execute on function private.social_profiles(uuid[]) to authenticated;

create or replace function public.get_social_profiles(p_ids uuid[])
returns table(id uuid, name text, avatar_url text)
language sql stable security invoker set search_path = ''
as $$ select * from private.social_profiles(p_ids); $$;
revoke all on function public.get_social_profiles(uuid[]) from public, anon;
grant execute on function public.get_social_profiles(uuid[]) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists avatars_read_contacts on storage.objects;
create policy avatars_read_contacts on storage.objects for select to authenticated
using (bucket_id = 'avatars' and (
  (storage.foldername(name))[1] = (select auth.uid())::text
  or exists (select 1 from private.social_profiles(array[
    case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      then (storage.foldername(name))[1]::uuid else null end
  ]) p where p.avatar_url = storage.objects.name)
));

commit;
