import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
// Execute com o caminho de uma instalação local de @electric-sql/pglite.
if (!process.argv[2]) throw new Error('Informe o caminho de @electric-sql/pglite/dist/index.js')
const { PGlite } = await import(pathToFileURL(resolve(process.argv[2])).href)
const db = new PGlite()
await db.exec(`
  create role anon; create role authenticated;
  create schema auth; create schema storage;
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  grant usage on schema auth,storage to authenticated;
  grant execute on function auth.uid() to authenticated;
  create table public.users(id uuid primary key, name text, avatar_url text);
  create table public.friend_connections(user_id_a uuid,user_id_b uuid);
  create table public.community_members(community_id uuid,user_id uuid);
  create table public.community_messages(community_id uuid,user_id uuid);
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id int generated always as identity,bucket_id text,name text);
  create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
  alter table storage.objects enable row level security;
  grant select,insert,delete on storage.objects to authenticated;
  grant usage on sequence storage.objects_id_seq to authenticated;
`)
await db.exec(readFileSync('supabase/migrations/20261023130746_social_profiles_and_training_music.sql','utf8'))
// Reaplicar deve preservar os dados e as políticas.
await db.exec(readFileSync('supabase/migrations/20261023130746_social_profiles_and_training_music.sql','utf8'))
const ids = [1,2,3,4].map(n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`)
const [me,friend,stranger,former] = ids
const group = '10000000-0000-4000-8000-000000000001'
for (const [i,id] of ids.entries()) await db.query('insert into public.users(id,name,avatar_url) values($1,$2,$3)',[id,`Pessoa ${i}`,`${id}/photo.jpg`])
await db.query('insert into public.friend_connections values($1,$2)',[me,friend])
await db.query('insert into public.community_members values($1,$2)',[group,me])
await db.query('insert into public.community_messages values($1,$2)',[group,former])
for(const id of ids)await db.query("insert into storage.objects(bucket_id,name) values('avatars',$1)",[`${id}/photo.jpg`])
await db.exec(`set role authenticated; set request.jwt.claim.sub = '${me}';`)
const people = await db.query('select * from public.get_social_profiles($1::uuid[])',[ids])
assert.deepEqual(people.rows.map(p=>p.id).sort(),[me,friend,former].sort())
assert.deepEqual((await db.query('select name from storage.objects')).rows.map(p=>p.name).sort(),[me,friend,former].map(id=>`${id}/photo.jpg`).sort())
await db.query("insert into storage.objects(bucket_id,name) values('avatars',$1)",[`${me}/new.jpg`])
await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('avatars',$1)",[`${stranger}/hacked.jpg`]),/row-level security/)
assert.equal((await db.query('delete from storage.objects where name=$1 returning *',[`${friend}/photo.jpg`])).rows.length,0)
assert.equal((await db.query('delete from storage.objects where name=$1 returning *',[`${me}/new.jpg`])).rows.length,1)
await db.exec(`reset role; set role anon;`)
await assert.rejects(db.query('select * from public.get_social_profiles($1::uuid[])',[ids]),/permission denied/)
await db.exec('reset role;')
console.log('PASS: migração executada em PostgreSQL isolado; perfis escopados, autor antigo, fotos privadas, escrita própria, bloqueio de anon.')
await db.close()
