alter table public.admin_users
  add column if not exists role text not null default 'admin';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_users_role_check'
      and conrelid = 'public.admin_users'::regclass
  ) then
    alter table public.admin_users
      add constraint admin_users_role_check check (role in ('admin', 'owner'));
  end if;
end;
$$;

create unique index if not exists admin_users_single_owner_idx
  on public.admin_users (role)
  where role = 'owner';

create or replace function public.verify_admin_access(requested_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  admin_record public.admin_users%rowtype;
begin
  if account_id is null then
    return false;
  end if;

  select *
  into admin_record
  from public.admin_users as admins
  where admins.user_id = account_id
  for update;

  if not found then
    return false;
  end if;

  if admin_record.locked_until > now() then
    return false;
  end if;

  if admin_record.locked_until is not null then
    update public.admin_users
    set failed_attempts = 0,
        locked_until = null
    where user_id = account_id;
  end if;

  if admin_record.access_code_hash is null
     or requested_code is null
     or char_length(requested_code) not between 4 and 64
     or requested_code !~ '^[A-Za-z0-9]+$'
     or extensions.crypt(requested_code, admin_record.access_code_hash) <> admin_record.access_code_hash then
    update public.admin_users
    set failed_attempts = failed_attempts + 1,
        locked_until = case
          when failed_attempts + 1 >= 5 then now() + interval '15 minutes'
          else null
        end
    where user_id = account_id;
    return false;
  end if;

  update public.admin_users
  set failed_attempts = 0,
      locked_until = null
  where user_id = account_id;

  return true;
end;
$$;

revoke all on function public.verify_admin_access(text) from public, anon;
revoke all on function public.verify_admin_access(text) from authenticated;

create or replace function public.get_admin_dashboard(requested_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  dashboard_data jsonb;
begin
  if not public.verify_admin_access(requested_code) then
    return jsonb_build_object(
      'error',
      'Admin-koden er forkert, ikke sat op, eller adgangen er låst.'
    );
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'current_role', (
      select admins.role
      from public.admin_users as admins
      where admins.user_id = auth.uid()
    ),
    'profiles', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'user_id', p.id,
          'nickname', p.nickname,
          'is_admin', exists (
            select 1
            from public.admin_users as admin_profile
            where admin_profile.user_id = p.id
          ),
          'admin_role', (
            select admin_profile.role
            from public.admin_users as admin_profile
            where admin_profile.user_id = p.id
          ),
          'display_name', case
            when p.display_name_mode = 'real_name' and private.real_name is not null
              then private.real_name
            else p.nickname
          end,
          'display_name_mode', p.display_name_mode,
          'bio', p.bio,
          'created_at', p.created_at,
          'public_profile_enabled', coalesce(private.public_profile_enabled, false),
          'public_profile_enabled_at', private.public_profile_enabled_at,
          'terms_accepted_at', private.terms_accepted_at,
          'privacy_accepted_at', private.privacy_accepted_at,
          'activity_count', (
            select count(*)
            from public.activities as counted
            where counted.user_id = p.id
          )
        )
        order by p.created_at desc
      )
      from public.profiles as p
      left join public.profile_private as private on private.user_id = p.id
    ), '[]'::jsonb),
    'activities', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', activity.id,
          'nickname', p.nickname,
          'description', activity.description,
          'created_at', activity.created_at
        )
        order by activity.created_at desc
      )
      from public.activities as activity
      join public.profiles as p on p.id = activity.user_id
    ), '[]'::jsonb)
  )
  into dashboard_data;

  return dashboard_data;
end;
$$;

create or replace function public.admin_update_profile(
  requested_code text,
  requested_nickname text,
  requested_display_name_mode text,
  requested_real_name text,
  requested_bio text,
  requested_public_profile_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_name text := nullif(trim(requested_real_name), '');
  normalized_bio text := trim(coalesce(requested_bio, ''));
  profile_id uuid;
begin
  if not public.verify_admin_access(requested_code) then
    return jsonb_build_object('error', 'Admin-koden er forkert, ikke sat op, eller adgangen er låst.');
  end if;
  if requested_display_name_mode not in ('nickname', 'real_name') then
    return jsonb_build_object('error', 'Vælg et gyldigt visningsnavn.');
  end if;
  if requested_display_name_mode = 'real_name'
     and (normalized_name is null or char_length(normalized_name) > 80) then
    return jsonb_build_object('error', 'Eget navn skal være udfyldt og højst 80 tegn.');
  end if;
  if normalized_name is not null and char_length(normalized_name) > 80 then
    return jsonb_build_object('error', 'Eget navn må højst være 80 tegn.');
  end if;
  if char_length(normalized_bio) > 240 then
    return jsonb_build_object('error', 'Profilteksten må højst være 240 tegn.');
  end if;
  if requested_public_profile_enabled is null then
    return jsonb_build_object('error', 'Vælg om profilen skal være offentlig.');
  end if;

  update public.profiles
  set display_name_mode = requested_display_name_mode,
      bio = normalized_bio
  where lower(nickname) = lower(trim(requested_nickname))
  returning id into profile_id;

  if profile_id is null then
    return jsonb_build_object('error', 'Profilen findes ikke længere.');
  end if;

  insert into public.profile_private as existing_profile (
    user_id,
    real_name,
    public_profile_enabled,
    public_profile_enabled_at
  )
  values (
    profile_id,
    normalized_name,
    requested_public_profile_enabled,
    case when requested_public_profile_enabled then now() else null end
  )
  on conflict (user_id) do update
  set real_name = coalesce(excluded.real_name, existing_profile.real_name),
      public_profile_enabled_at = case
        when excluded.public_profile_enabled and not existing_profile.public_profile_enabled
          then now()
        when not excluded.public_profile_enabled then null
        else existing_profile.public_profile_enabled_at
      end,
      public_profile_enabled = excluded.public_profile_enabled;

  return jsonb_build_object('updated', true);
end;
$$;

create or replace function public.admin_delete_activity(
  requested_code text,
  requested_activity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.verify_admin_access(requested_code) then
    return jsonb_build_object('error', 'Admin-koden er forkert, ikke sat op, eller adgangen er låst.');
  end if;

  delete from public.activities
  where id = requested_activity_id;

  if not found then
    return jsonb_build_object('error', 'Aktiviteten findes ikke længere.');
  end if;

  return jsonb_build_object('deleted', true);
end;
$$;

create or replace function public.admin_delete_profile(
  requested_code text,
  requested_nickname text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_id uuid;
begin
  if not public.verify_admin_access(requested_code) then
    return jsonb_build_object('error', 'Admin-koden er forkert, ikke sat op, eller adgangen er låst.');
  end if;

  select p.id
  into profile_id
  from public.profiles as p
  where lower(p.nickname) = lower(trim(requested_nickname));

  if profile_id is null then
    return jsonb_build_object('error', 'Profilen findes ikke længere.');
  end if;

  if profile_id = auth.uid() then
    return jsonb_build_object('error', 'Du kan ikke slette den admin-konto, du er logget ind med.');
  end if;

  if exists (
    select 1
    from public.admin_users as admins
    where admins.user_id = profile_id
  ) then
    return jsonb_build_object('error', 'En anden admin-konto kan ikke slettes her.');
  end if;

  delete from auth.users
  where id = profile_id;

  if not found then
    return jsonb_build_object('error', 'Brugerkontoen kunne ikke slettes.');
  end if;

  return jsonb_build_object('deleted', true);
end;
$$;

create or replace function public.admin_add_user(
  requested_code text,
  requested_nickname text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_id uuid;
begin
  if not public.verify_admin_access(requested_code) then
    return jsonb_build_object('error', 'Admin-koden er forkert, ikke sat op, eller adgangen er låst.');
  end if;

  if not exists (
    select 1
    from public.admin_users as admins
    where admins.user_id = auth.uid()
      and admins.role = 'owner'
  ) then
    return jsonb_build_object('error', 'Kun Owner kan tilføje admin-konti.');
  end if;

  select p.id
  into profile_id
  from public.profiles as p
  where lower(p.nickname) = lower(trim(requested_nickname));

  if profile_id is null then
    return jsonb_build_object('error', 'Der findes ingen konto med det kaldenavn.');
  end if;

  insert into public.admin_users (user_id, access_code_hash, role)
  values (
    profile_id,
    extensions.crypt(requested_code, extensions.gen_salt('bf')),
    'admin'
  )
  on conflict (user_id) do nothing;

  return jsonb_build_object('added', true);
end;
$$;

create or replace function public.admin_remove_user(
  requested_code text,
  requested_nickname text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_id uuid;
begin
  if not public.verify_admin_access(requested_code) then
    return jsonb_build_object('error', 'Admin-koden er forkert, ikke sat op, eller adgangen er låst.');
  end if;

  if not exists (
    select 1
    from public.admin_users as admins
    where admins.user_id = auth.uid()
      and admins.role = 'owner'
  ) then
    return jsonb_build_object('error', 'Kun Owner kan fjerne admin-adgang.');
  end if;

  select p.id
  into profile_id
  from public.profiles as p
  where lower(p.nickname) = lower(trim(requested_nickname));

  if profile_id is null then
    return jsonb_build_object('error', 'Profilen findes ikke længere.');
  end if;

  if profile_id = auth.uid() then
    return jsonb_build_object('error', 'Owner-adgangen kan ikke fjernes her.');
  end if;

  delete from public.admin_users
  where user_id = profile_id
    and role = 'admin';

  if not found then
    return jsonb_build_object('error', 'Kontoen er ikke en admin.');
  end if;

  return jsonb_build_object('removed', true);
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
    'privacy_accepted_at', private.privacy_accepted_at,
    'admin_role', admins.role
  )
  from public.profiles as p
  left join public.profile_private as private on private.user_id = p.id
  left join public.admin_users as admins on admins.user_id = p.id
  where p.id = (select auth.uid());
$$;

create or replace function public.change_profile_nickname(new_nickname text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_nickname text := trim(new_nickname);
begin
  if current_user_id is null then
    raise exception 'You must be signed in to change your nickname.';
  end if;

  if normalized_nickname is null
     or normalized_nickname !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Nickname must be 3–20 letters, numbers, or underscores.';
  end if;

  update public.profiles
  set nickname = normalized_nickname
  where id = current_user_id;

  if not found then
    raise exception 'Profile not found.';
  end if;

  update auth.users
  set email = lower(normalized_nickname) || '@users.hverdagens.invalid',
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('nickname', normalized_nickname),
      updated_at = now()
  where id = current_user_id;
end;
$$;

revoke all on function public.get_admin_dashboard(text) from public, anon;
revoke all on function public.admin_update_profile(text, text, text, text, text, boolean) from public, anon;
revoke all on function public.admin_delete_activity(text, uuid) from public, anon;
revoke all on function public.admin_delete_profile(text, text) from public, anon;
revoke all on function public.admin_add_user(text, text) from public, anon;
revoke all on function public.admin_remove_user(text, text) from public, anon;
revoke all on function public.change_profile_nickname(text) from public, anon;
grant execute on function public.get_admin_dashboard(text) to authenticated;
grant execute on function public.admin_update_profile(text, text, text, text, text, boolean) to authenticated;
grant execute on function public.admin_delete_activity(text, uuid) to authenticated;
grant execute on function public.admin_delete_profile(text, text) to authenticated;
grant execute on function public.admin_add_user(text, text) to authenticated;
grant execute on function public.admin_remove_user(text, text) to authenticated;
grant execute on function public.change_profile_nickname(text) to authenticated;
grant execute on function public.get_my_profile() to authenticated;

notify pgrst, 'reload schema';
