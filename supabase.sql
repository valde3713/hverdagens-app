do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'drop policy if exists "Signed-in users can view profiles" on public.profiles';
  end if;
  if to_regclass('public.activities') is not null then
    execute 'drop policy if exists "Users can view their own activities" on public.activities';
    execute 'drop policy if exists "Users can add their own activities" on public.activities';
    execute 'drop policy if exists "Users can delete their own activities" on public.activities';
  end if;
end;
$$;

drop function if exists public.create_email_mfa_challenge(uuid, text, text, text, timestamptz);
drop function if exists public.get_leaderboard();
drop function if exists public.change_profile_nickname(text);
drop function if exists public.has_valid_email_mfa_session();
drop function if exists public.search_public_profiles(text);
drop function if exists public.get_public_profile(uuid);
drop function if exists public.get_my_profile();
drop function if exists public.export_my_data();
drop function if exists public.delete_my_account();

drop table if exists public.email_mfa_sessions;
drop table if exists public.email_mfa_challenges;
drop table if exists public.email_mfa_settings;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null unique,
  constraint profiles_nickname_format_check
    check (nickname ~ '^[A-Za-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name_mode text not null default 'nickname',
  add column if not exists bio text not null default '';

alter table public.profiles
  drop constraint if exists profiles_display_name_mode_check,
  add constraint profiles_display_name_mode_check
    check (display_name_mode in ('nickname', 'real_name')),
  drop constraint if exists profiles_bio_length_check,
  add constraint profiles_bio_length_check
    check (char_length(bio) <= 240);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  description text not null check (char_length(trim(description)) between 1 and 240),
  created_at timestamptz not null default now()
);

create table if not exists public.profile_private (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  real_name text,
  public_profile_enabled boolean not null default false,
  public_profile_enabled_at timestamptz,
  terms_version text,
  terms_accepted_at timestamptz,
  privacy_version text,
  privacy_accepted_at timestamptz,
  constraint profile_private_email_format_check
    check (email is null or (
      email = lower(trim(email))
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    )),
  constraint profile_private_real_name_length_check
    check (real_name is null or char_length(trim(real_name)) between 1 and 80)
);

alter table public.profile_private
  add column if not exists public_profile_enabled boolean not null default false,
  add column if not exists public_profile_enabled_at timestamptz;

insert into public.profile_private (user_id)
select id from auth.users
on conflict (user_id) do nothing;

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
alter table public.profile_private enable row level security;

revoke all on public.profiles from public, anon, authenticated;
revoke all on public.activities from public, anon, authenticated;
revoke all on public.profile_private from public, anon, authenticated;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can view own private profile data" on public.profile_private;
create policy "Users can view own private profile data"
  on public.profile_private for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view their own activities"
  on public.activities for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own activities"
  on public.activities for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own activities"
  on public.activities for delete
  to authenticated
  using ((select auth.uid()) = user_id);

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

  if coalesce(new.raw_user_meta_data ->> 'terms_accepted', '') <> 'true'
     or coalesce(new.raw_user_meta_data ->> 'privacy_accepted', '') <> 'true'
     or coalesce(new.raw_user_meta_data ->> 'terms_version', '') <> '2026-10-23'
     or coalesce(new.raw_user_meta_data ->> 'privacy_version', '') <> '2026-10-23' then
    raise exception 'You must accept the current terms and privacy notice to create an account.';
  end if;

  if lower(trim(coalesce(new.raw_user_meta_data ->> 'contact_email', '')))
       !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
     or coalesce(new.raw_user_meta_data ->> 'display_name_mode', '') not in ('nickname', 'real_name')
     or (new.raw_user_meta_data ->> 'display_name_mode' = 'real_name'
       and char_length(trim(coalesce(new.raw_user_meta_data ->> 'real_name', ''))) not between 1 and 80) then
    raise exception 'Enter a valid email address and profile name.';
  end if;

  insert into public.profiles (id, nickname)
  values (
    new.id,
    new.raw_user_meta_data ->> 'nickname'
  );

  update public.profiles
  set display_name_mode = new.raw_user_meta_data ->> 'display_name_mode'
  where id = new.id;

  insert into public.profile_private (
    user_id,
    email,
    real_name,
    terms_version,
    terms_accepted_at,
    privacy_version,
    privacy_accepted_at,
    public_profile_enabled,
    public_profile_enabled_at
  )
  values (
    new.id,
    lower(trim(new.raw_user_meta_data ->> 'contact_email')),
    nullif(trim(new.raw_user_meta_data ->> 'real_name'), ''),
    '2026-10-23',
    now(),
    '2026-10-23',
    now(),
    true,
    now()
  );

  return new;
end;
$$;

revoke all on function public.create_profile_for_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

create or replace function public.get_leaderboard()
returns table (user_id uuid, display_name text, points bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    case
      when p.display_name_mode = 'real_name' and private.real_name is not null
        then private.real_name
      else p.nickname
    end,
    count(a.id)::bigint as points
  from public.profiles as p
  left join public.profile_private as private on private.user_id = p.id
  left join public.activities as a on a.user_id = p.id
  where private.public_profile_enabled or p.id = (select auth.uid())
  group by p.id, p.nickname, p.display_name_mode, private.real_name
  order by count(a.id) desc, 2 asc;
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to authenticated;

create or replace function public.search_public_profiles(search_text text)
returns table (user_id uuid, display_name text, points bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    case
      when p.display_name_mode = 'real_name' and private.real_name is not null
        then private.real_name
      else p.nickname
    end,
    count(a.id)::bigint as points
  from public.profiles as p
  left join public.profile_private as private on private.user_id = p.id
  left join public.activities as a on a.user_id = p.id
  where (select auth.uid()) is not null
    and char_length(trim(coalesce(search_text, ''))) between 2 and 80
    and private.public_profile_enabled
    and strpos(
      lower(case
        when p.display_name_mode = 'real_name' and private.real_name is not null
          then private.real_name
        else p.nickname
      end),
      lower(trim(search_text))
    ) > 0
  group by p.id, p.nickname, p.display_name_mode, private.real_name
  order by count(a.id) desc, 2 asc
  limit 20;
$$;

revoke all on function public.search_public_profiles(text) from public, anon;
grant execute on function public.search_public_profiles(text) to authenticated;

create or replace function public.get_public_profile(requested_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', p.id,
    'display_name', case
      when p.display_name_mode = 'real_name' and private.real_name is not null
        then private.real_name
      else p.nickname
    end,
    'bio', p.bio,
    'points', (select count(*) from public.activities as counted where counted.user_id = p.id),
    'activities', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', recent.id,
          'description', recent.description,
          'created_at', recent.created_at
        )
        order by recent.created_at desc
      )
      from (
        select id, description, created_at
        from public.activities
        where user_id = p.id
        order by created_at desc
        limit 100
      ) as recent
    ), '[]'::jsonb)
  )
  from public.profiles as p
  left join public.profile_private as private on private.user_id = p.id
  where p.id = requested_user_id
    and (private.public_profile_enabled or p.id = (select auth.uid()))
    and (select auth.uid()) is not null;
$$;

revoke all on function public.get_public_profile(uuid) from public, anon;
grant execute on function public.get_public_profile(uuid) to authenticated;

create or replace function public.get_my_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', p.id,
    'nickname', p.nickname,
    'display_name_mode', p.display_name_mode,
    'display_name', case
      when p.display_name_mode = 'real_name' and private.real_name is not null
        then private.real_name
      else p.nickname
    end,
    'real_name', private.real_name,
    'bio', p.bio,
    'email', private.email,
    'public_profile_enabled', private.public_profile_enabled,
    'public_profile_enabled_at', private.public_profile_enabled_at,
    'terms_accepted_at', private.terms_accepted_at,
    'privacy_accepted_at', private.privacy_accepted_at
  )
  from public.profiles as p
  left join public.profile_private as private on private.user_id = p.id
  where p.id = (select auth.uid());
$$;

revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

create or replace function public.update_my_public_profile(
  requested_display_name_mode text,
  requested_real_name text,
  requested_bio text,
  requested_email text,
  requested_public_profile_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  normalized_name text := nullif(trim(requested_real_name), '');
  normalized_email text := lower(trim(coalesce(requested_email, '')));
  normalized_bio text := trim(coalesce(requested_bio, ''));
begin
  if account_id is null then
    raise exception 'You must be signed in to update your profile.';
  end if;
  if requested_display_name_mode not in ('nickname', 'real_name') then
    raise exception 'Choose a valid public display name.';
  end if;
  if requested_display_name_mode = 'real_name'
     and (normalized_name is null or char_length(normalized_name) > 80) then
    raise exception 'Enter a name of at most 80 characters.';
  end if;
  if normalized_name is not null and char_length(normalized_name) > 80 then
    raise exception 'Enter a name of at most 80 characters.';
  end if;
  if normalized_bio is null or char_length(normalized_bio) > 240 then
    raise exception 'Profile text must be at most 240 characters.';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'Enter a valid email address.';
  end if;

  update public.profiles
  set display_name_mode = requested_display_name_mode,
      bio = normalized_bio
  where id = account_id;

  update public.profile_private
  set real_name = normalized_name,
      email = normalized_email,
      public_profile_enabled = requested_public_profile_enabled,
      public_profile_enabled_at = case
        when requested_public_profile_enabled and not public_profile_enabled then now()
        else public_profile_enabled_at
      end
  where user_id = account_id;

  if not found then
    raise exception 'The private profile could not be found.';
  end if;
end;
$$;

revoke all on function public.update_my_public_profile(text, text, text, text, boolean) from public, anon;
grant execute on function public.update_my_public_profile(text, text, text, text, boolean) to authenticated;

create or replace function public.export_my_data()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', jsonb_build_object(
      'nickname', p.nickname,
      'display_name_mode', p.display_name_mode,
      'real_name', private.real_name,
      'bio', p.bio,
      'created_at', p.created_at
    ),
    'private_contact', jsonb_build_object(
      'email', private.email,
      'terms_version', private.terms_version,
      'terms_accepted_at', private.terms_accepted_at,
      'privacy_version', private.privacy_version,
      'privacy_accepted_at', private.privacy_accepted_at,
      'public_profile_enabled', private.public_profile_enabled,
      'public_profile_enabled_at', private.public_profile_enabled_at
    ),
    'activities', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', a.id, 'description', a.description, 'created_at', a.created_at)
        order by a.created_at
      )
      from public.activities as a
      where a.user_id = p.id
    ), '[]'::jsonb)
  )
  from public.profiles as p
  join public.profile_private as private on private.user_id = p.id
  where p.id = (select auth.uid());
$$;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
begin
  if account_id is null then
    raise exception 'You must be signed in to delete your account.';
  end if;

  delete from auth.users
  where id = account_id;

  if not found then
    raise exception 'The signed-in account could not be found.';
  end if;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

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

notify pgrst, 'reload schema';
