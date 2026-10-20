-- Expand friend invite codes to 128-bit hex identifiers.
-- Existing short codes are rotated so the public lookup RPC no longer exposes
-- a small enumerable code space.
update public.users
set friend_invite_code = substr(md5(random()::text || clock_timestamp()::text || id::text), 1, 16)
where friend_invite_code is null
   or length(friend_invite_code) < 16;

alter table public.users
  alter column friend_invite_code
  set default substr(md5(random()::text || clock_timestamp()::text), 1, 16);
