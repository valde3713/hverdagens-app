create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null unique,
  constraint profiles_nickname_format_check
    check (nickname ~ '^[A-Za-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  description text not null check (char_length(trim(description)) between 1 and 240),
  created_at timestamptz not null default now()
);

create table if not exists public.email_mfa_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  constraint email_mfa_settings_email_format_check
    check (email = lower(trim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')
);

create unique index if not exists email_mfa_settings_email_lower_unique_idx
  on public.email_mfa_settings (lower(email));

create table if not exists public.email_mfa_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  purpose text not null check (purpose in ('enroll', 'login')),
  email text not null,
  code_hash text not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists email_mfa_challenges_user_purpose_created_idx
  on public.email_mfa_challenges (user_id, purpose, created_at desc);

create table if not exists public.email_mfa_sessions (
  session_id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists email_mfa_sessions_user_expiry_idx
  on public.email_mfa_sessions (user_id, expires_at);

alter table public.email_mfa_settings enable row level security;
alter table public.email_mfa_challenges enable row level security;
alter table public.email_mfa_sessions enable row level security;
revoke all on public.email_mfa_settings, public.email_mfa_challenges, public.email_mfa_sessions
  from public, anon, authenticated;
grant all on public.email_mfa_settings, public.email_mfa_challenges, public.email_mfa_sessions
  to service_role;

create index if not exists activities_user_created_at_idx
  on public.activities (user_id, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_nickname_format_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_nickname_format_check
      check (nickname ~ '^[A-Za-z0-9_]{3,20}$');
  end if;
end;
$$;

create unique index if not exists profiles_nickname_lower_unique_idx
  on public.profiles (lower(nickname));

alter table public.profiles enable row level security;
alter table public.activities enable row level security;

revoke all on public.profiles from public, anon, authenticated;
revoke all on public.activities from public, anon, authenticated;

create or replace function public.has_valid_email_mfa_session()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    not exists (
      select 1
      from public.email_mfa_settings as settings
      where settings.user_id = (select auth.uid())
        and settings.enabled
    )
    or exists (
      select 1
      from public.email_mfa_sessions as sessions
      where sessions.user_id = (select auth.uid())
        and sessions.session_id = (select auth.jwt() ->> 'session_id')
        and sessions.expires_at > now()
    );
$$;

revoke all on function public.has_valid_email_mfa_session() from public, anon;
grant execute on function public.has_valid_email_mfa_session() to authenticated;

drop policy if exists "Signed-in users can view profiles" on public.profiles;
create policy "Signed-in users can view profiles"
  on public.profiles for select
  to authenticated
  using ((select public.has_valid_email_mfa_session()));

drop policy if exists "Users can view their own activities" on public.activities;
create policy "Users can view their own activities"
  on public.activities for select
  to authenticated
  using ((select auth.uid()) = user_id and (select public.has_valid_email_mfa_session()));

drop policy if exists "Users can add their own activities" on public.activities;
create policy "Users can add their own activities"
  on public.activities for insert
  to authenticated
  with check ((select auth.uid()) = user_id and (select public.has_valid_email_mfa_session()));

drop policy if exists "Users can delete their own activities" on public.activities;
create policy "Users can delete their own activities"
  on public.activities for delete
  to authenticated
  using ((select auth.uid()) = user_id and (select public.has_valid_email_mfa_session()));

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'nickname', '') !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Nickname must be 3–20 letters, numbers, or underscores.';
  end if;

  insert into public.profiles (id, nickname)
  values (new.id, new.raw_user_meta_data ->> 'nickname');
  return new;
end;
$$;

revoke all on function public.create_profile_for_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

create or replace function public.get_leaderboard()
returns table (user_id uuid, nickname text, points bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.nickname, count(a.id)::bigint as points
  from public.profiles as p
  left join public.activities as a on a.user_id = p.id
  where public.has_valid_email_mfa_session()
  group by p.id, p.nickname
  order by count(a.id) desc, p.nickname asc;
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to authenticated;

create or replace function public.get_login_email(requested_nickname text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when trim(coalesce(requested_nickname, '')) ~ '^[A-Za-z0-9_]{3,20}$'
      then lower(trim(requested_nickname)) || '@users.hverdagens.invalid'
    else null
  end;
$$;

revoke all on function public.get_login_email(text) from public;
grant execute on function public.get_login_email(text) to anon, authenticated;

create or replace function public.change_profile_nickname(new_nickname text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_nickname text := trim(new_nickname);
  deed_count bigint;
begin
  if current_user_id is null then
    raise exception 'You must be signed in to change your nickname.';
  end if;

  if not public.has_valid_email_mfa_session() then
    raise exception 'Complete email verification before changing your nickname.';
  end if;

  if normalized_nickname !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Nickname must be 3–20 letters, numbers, or underscores.';
  end if;

  select count(*) into deed_count
  from public.activities
  where user_id = current_user_id;

  if deed_count <= 35 then
    raise exception 'Share at least 36 good deeds before changing your nickname.';
  end if;

  update public.profiles
  set nickname = normalized_nickname
  where id = current_user_id;

  update auth.users
  set email = lower(normalized_nickname) || '@users.hverdagens.invalid',
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('nickname', normalized_nickname),
      updated_at = now()
  where id = current_user_id;
end;
$$;

revoke all on function public.change_profile_nickname(text) from public;
grant execute on function public.change_profile_nickname(text) to authenticated;

grant select on public.profiles to authenticated;
grant select, insert, delete on public.activities to authenticated;

create or replace function public.create_email_mfa_challenge(
  requested_user_id uuid,
  requested_purpose text,
  requested_email text,
  requested_code_hash text,
  requested_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_count integer;
  latest_request timestamptz;
  challenge_id uuid;
begin
  if requested_purpose not in ('enroll', 'login') then
    raise exception 'Invalid verification request.';
  end if;

  if requested_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     or requested_email <> lower(trim(requested_email))
     or requested_code_hash !~ '^[a-f0-9]{64}$'
     or requested_expires_at <= now()
     or requested_expires_at > now() + interval '15 minutes' then
    raise exception 'Invalid verification request.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(requested_user_id::text, 0));

  delete from public.email_mfa_challenges
  where user_id = requested_user_id
    and created_at < now() - interval '24 hours';

  select count(*)::integer, max(created_at)
  into recent_count, latest_request
  from public.email_mfa_challenges
  where user_id = requested_user_id
    and created_at >= now() - interval '1 hour';

  if recent_count >= 5 then
    raise exception 'Du har bedt om for mange koder. Prøv igen om en time.';
  end if;
  if latest_request is not null and latest_request >= now() - interval '1 minute' then
    raise exception 'Vent et minut, før du beder om en ny kode.';
  end if;

  insert into public.email_mfa_challenges (
    user_id, purpose, email, code_hash, expires_at
  )
  values (
    requested_user_id, requested_purpose, requested_email,
    requested_code_hash, requested_expires_at
  )
  returning id into challenge_id;

  return challenge_id;
end;
$$;

revoke all on function public.create_email_mfa_challenge(uuid, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.create_email_mfa_challenge(uuid, text, text, text, timestamptz)
  to service_role;

notify pgrst, 'reload schema';
