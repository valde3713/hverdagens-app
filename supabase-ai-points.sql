create table if not exists public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_id uuid references public.activities (id) on delete set null,
  points integer not null check (points between -100 and 100),
  source text not null check (source in ('local_ai', 'admin_adjustment', 'legacy')),
  reason text not null check (char_length(trim(reason)) between 1 and 500),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.point_ledger
  drop constraint if exists point_ledger_source_check,
  drop constraint if exists point_ledger_points_check;

update public.point_ledger
set source = 'local_ai'
where source = 'ai';

alter table public.point_ledger
  add constraint point_ledger_source_check
    check (source in ('local_ai', 'admin_adjustment', 'legacy')),
  add constraint point_ledger_points_check
    check (points between -100 and 100);

drop index if exists public.point_ledger_one_ai_score_per_activity;
drop index if exists public.point_ledger_one_score_per_activity;

create unique index if not exists point_ledger_one_score_per_activity
  on public.point_ledger (activity_id)
  where source in ('local_ai', 'legacy') and activity_id is not null;

create index if not exists point_ledger_user_created_at_idx
  on public.point_ledger (user_id, created_at desc);

insert into public.point_ledger (user_id, activity_id, points, source, reason, created_at)
select
  activity.user_id,
  activity.id,
  1,
  'legacy',
  'Historisk point for en tidligere delt gerning.',
  activity.created_at
from public.activities as activity
where not exists (
  select 1
  from public.point_ledger as entry
  where entry.activity_id = activity.id
)
on conflict do nothing;

alter table public.point_ledger enable row level security;
revoke all on public.point_ledger from public, anon, authenticated;

create or replace function public.admin_adjust_points(
  requested_code text,
  requested_nickname text,
  requested_points integer,
  requested_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user_id uuid;
  normalized_reason text := trim(coalesce(requested_reason, ''));
begin
  if not public.verify_admin_access(requested_code) then
    return jsonb_build_object('error', 'Admin-koden er forkert, ikke sat op, eller adgangen er låst.');
  end if;

  if requested_points is null or requested_points not between -100 and 100 or requested_points = 0 then
    return jsonb_build_object('error', 'En justering skal være mellem -100 og 100 og må ikke være 0.');
  end if;

  if char_length(normalized_reason) not between 1 and 300 then
    return jsonb_build_object('error', 'Skriv en begrundelse på 1–300 tegn.');
  end if;

  select id
  into target_user_id
  from public.profiles
  where lower(nickname) = lower(trim(requested_nickname));

  if target_user_id is null then
    return jsonb_build_object('error', 'Profilen findes ikke længere.');
  end if;

  insert into public.point_ledger (user_id, points, source, reason, created_by)
  values (target_user_id, requested_points, 'admin_adjustment', normalized_reason, auth.uid());

  return jsonb_build_object('adjusted', true);
end;
$$;

create or replace function public.get_point_management_data(requested_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not public.verify_admin_access(requested_code) then
    return jsonb_build_object('error', 'Admin-koden er forkert, ikke sat op, eller adgangen er låst.');
  end if;

  select jsonb_build_object(
    'profiles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', profile.id,
        'nickname', profile.nickname,
        'points', coalesce(score.total, 0)
      ) order by profile.nickname)
      from public.profiles as profile
      left join (
        select user_id, sum(points) as total
        from public.point_ledger
        group by user_id
      ) as score on score.user_id = profile.id
    ), '[]'::jsonb),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', entry.id,
        'nickname', profile.nickname,
        'points', entry.points,
        'source', entry.source,
        'reason', entry.reason,
        'created_at', entry.created_at
      ) order by entry.created_at desc)
      from (
        select *
        from public.point_ledger
        order by created_at desc
        limit 200
      ) as entry
      left join public.profiles as profile on profile.id = entry.user_id
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

create or replace function public.award_local_deed_point(
  requested_activity_id uuid,
  requested_points integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  activity_owner uuid;
begin
  if account_id is null then
    raise exception 'Log ind for at registrere point.';
  end if;

  if requested_points is null
     or requested_points not between -1 and 5
     or requested_points = 0 then
    raise exception 'Point skal være -1 eller mellem 1 og 5.';
  end if;

  select user_id
  into activity_owner
  from public.activities
  where id = requested_activity_id;

  if activity_owner is distinct from account_id then
    raise exception 'Gerningen findes ikke på din konto.';
  end if;

  insert into public.point_ledger (user_id, activity_id, points, source, reason, created_by)
  values (
    account_id,
    requested_activity_id,
    requested_points,
    'local_ai',
    case
      when requested_points < 0 then 'Den lokale AI vurderede handlingen som skadelig for naturen.'
      else 'Den lokale AI vurderede handlingen som gavnlig for naturen.'
    end,
    account_id
  )
  on conflict do nothing;

  if not found then
    return jsonb_build_object('already_awarded', true);
  end if;

  return jsonb_build_object('awarded', true, 'points', requested_points);
end;
$$;

create or replace function public.get_leaderboard()
returns table (user_id uuid, display_name text, points bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.id,
    case
      when profile.display_name_mode = 'real_name' and private.real_name is not null
        then private.real_name
      else profile.nickname
    end,
    coalesce(sum(entry.points), 0)::bigint
  from public.profiles as profile
  left join public.profile_private as private on private.user_id = profile.id
  left join public.point_ledger as entry on entry.user_id = profile.id
  where private.public_profile_enabled or profile.id = (select auth.uid())
  group by profile.id, profile.nickname, profile.display_name_mode, private.real_name
  order by coalesce(sum(entry.points), 0) desc, 2 asc;
$$;

create or replace function public.search_public_profiles(search_text text)
returns table (user_id uuid, display_name text, points bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profile.id,
    case
      when profile.display_name_mode = 'real_name' and private.real_name is not null
        then private.real_name
      else profile.nickname
    end,
    coalesce(sum(entry.points), 0)::bigint
  from public.profiles as profile
  left join public.profile_private as private on private.user_id = profile.id
  left join public.point_ledger as entry on entry.user_id = profile.id
  where (select auth.uid()) is not null
    and char_length(trim(coalesce(search_text, ''))) between 2 and 80
    and private.public_profile_enabled
    and strpos(lower(case
      when profile.display_name_mode = 'real_name' and private.real_name is not null
        then private.real_name
      else profile.nickname
    end), lower(trim(search_text))) > 0
  group by profile.id, profile.nickname, profile.display_name_mode, private.real_name
  order by coalesce(sum(entry.points), 0) desc, 2 asc
  limit 20;
$$;

create or replace function public.get_public_profile(requested_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', profile.id,
    'display_name', case
      when profile.display_name_mode = 'real_name' and private.real_name is not null
        then private.real_name
      else profile.nickname
    end,
    'bio', profile.bio,
    'admin_role', admins.role,
    'points', (
      select coalesce(sum(entry.points), 0)
      from public.point_ledger as entry
      where entry.user_id = profile.id
    ),
    'activities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', recent.id,
        'description', recent.description,
        'created_at', recent.created_at,
        'image_path', recent.image_path,
        'points', (
          select coalesce(sum(entry.points), 0)
          from public.point_ledger as entry
          where entry.activity_id = recent.id
        )
      ) order by recent.created_at desc)
      from (
        select id, description, created_at, image_path
        from public.activities
        where user_id = profile.id
        order by created_at desc
        limit 100
      ) as recent
    ), '[]'::jsonb)
  )
  from public.profiles as profile
  left join public.profile_private as private on private.user_id = profile.id
  left join public.admin_users as admins on admins.user_id = profile.id
  where profile.id = requested_user_id
    and (private.public_profile_enabled or profile.id = (select auth.uid()))
    and (select auth.uid()) is not null;
$$;

create or replace function public.get_my_point_history()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', entry.id,
    'activity_id', entry.activity_id,
    'points', entry.points,
    'source', entry.source,
    'reason', entry.reason,
    'created_at', entry.created_at
  ) order by entry.created_at desc), '[]'::jsonb)
  from public.point_ledger as entry
  where entry.user_id = (select auth.uid());
$$;

create or replace function public.owner_delete_own_negative_point(requested_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
begin
  if account_id is null or not exists (
    select 1
    from public.admin_users
    where user_id = account_id
      and role = 'owner'
  ) then
    raise exception 'Kun Owner kan slette egne minuspoint.';
  end if;

  delete from public.point_ledger
  where id = requested_entry_id
    and user_id = account_id
    and points = -1;

  if not found then
    return jsonb_build_object('error', 'Kun dine egne minuspoint på præcis 1 point kan slettes.');
  end if;

  return jsonb_build_object('deleted', true);
end;
$$;

create or replace function public.get_my_profile()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', profile.id,
    'nickname', profile.nickname,
    'display_name_mode', profile.display_name_mode,
    'display_name', case
      when profile.display_name_mode = 'real_name' and private.real_name is not null
        then private.real_name
      else profile.nickname
    end,
    'real_name', private.real_name,
    'bio', profile.bio,
    'email', private.email,
    'public_profile_enabled', private.public_profile_enabled,
    'public_profile_enabled_at', private.public_profile_enabled_at,
    'terms_accepted_at', private.terms_accepted_at,
    'privacy_accepted_at', private.privacy_accepted_at,
    'admin_role', admins.role,
    'activity_count', (
      select count(*)
      from public.activities as activity
      where activity.user_id = profile.id
    )
  )
  from public.profiles as profile
  left join public.profile_private as private on private.user_id = profile.id
  left join public.admin_users as admins on admins.user_id = profile.id
  where profile.id = (select auth.uid());
$$;

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
      'nickname', profile.nickname,
      'display_name_mode', profile.display_name_mode,
      'real_name', private.real_name,
      'bio', profile.bio,
      'created_at', profile.created_at
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
      select jsonb_agg(jsonb_build_object(
        'id', activity.id,
        'description', activity.description,
        'created_at', activity.created_at,
        'image_path', activity.image_path
      ) order by activity.created_at)
      from public.activities as activity
      where activity.user_id = profile.id
    ), '[]'::jsonb),
    'point_history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'points', entry.points,
        'source', entry.source,
        'reason', entry.reason,
        'created_at', entry.created_at
      ) order by entry.created_at)
      from public.point_ledger as entry
      where entry.user_id = profile.id
    ), '[]'::jsonb)
  )
  from public.profiles as profile
  join public.profile_private as private on private.user_id = profile.id
  where profile.id = (select auth.uid());
$$;

revoke all on function public.admin_adjust_points(text, text, integer, text) from public, anon;
revoke all on function public.get_point_management_data(text) from public, anon;
drop function if exists public.award_local_deed_point(uuid);
revoke all on function public.award_local_deed_point(uuid, integer) from public, anon;
revoke all on function public.get_my_point_history() from public, anon;
revoke all on function public.owner_delete_own_negative_point(uuid) from public, anon;
revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.admin_adjust_points(text, text, integer, text) to authenticated;
grant execute on function public.get_point_management_data(text) to authenticated;
grant execute on function public.award_local_deed_point(uuid, integer) to authenticated;
grant execute on function public.get_leaderboard() to authenticated;
grant execute on function public.search_public_profiles(text) to authenticated;
grant execute on function public.get_public_profile(uuid) to authenticated;
grant execute on function public.export_my_data() to authenticated;
grant execute on function public.get_my_point_history() to authenticated;
grant execute on function public.owner_delete_own_negative_point(uuid) to authenticated;
grant execute on function public.get_my_profile() to authenticated;

drop function if exists public.get_current_point_policy();
drop function if exists public.save_point_policy(text, integer, integer, text);
drop function if exists public.record_ai_point_award(uuid, uuid, integer, text);
drop function if exists public.claim_ai_point_score(uuid, uuid);
drop table if exists public.point_score_attempts;
drop table if exists public.point_rules;

notify pgrst, 'reload schema';
