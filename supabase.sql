create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  description text not null check (char_length(trim(description)) between 1 and 240),
  created_at timestamptz not null default now()
);

create index if not exists activities_user_created_at_idx
  on public.activities (user_id, created_at desc);

create unique index if not exists profiles_nickname_lower_unique_idx
  on public.profiles (lower(nickname));

alter table public.profiles enable row level security;
alter table public.activities enable row level security;

drop policy if exists "Signed-in users can view profiles" on public.profiles;
create policy "Signed-in users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Users can view their own activities" on public.activities;
create policy "Users can view their own activities"
  on public.activities for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own activities" on public.activities;
create policy "Users can add their own activities"
  on public.activities for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own activities" on public.activities;
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
  group by p.id, p.nickname
  order by count(a.id) desc, p.nickname asc;
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to authenticated;

create or replace function public.get_login_email(requested_nickname text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
  from public.profiles as p
  join auth.users as u on u.id = p.id
  where lower(p.nickname) = lower(trim(requested_nickname))
  limit 1;
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
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
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
