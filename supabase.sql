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

grant select on public.profiles to authenticated;
grant select, insert on public.activities to authenticated;
