-- Run after supabase.sql and supabase-admin-management.sql.
-- Replace the nickname and admin-code placeholders before running.
-- Use account nicknames only; never put personal login passcodes here.
do $$
declare
  owner_nickname text := 'test';
  admin_nicknames text[] := array[
    'ADMIN_KALDENAVN_1',
    'ADMIN_KALDENAVN_2'
  ];
  chosen_admin_code text := 'VAELG_DIN_EGEN_ADMIN_KODE';
  owner_id uuid;
  admin_nickname text;
  admin_id uuid;
begin
  if chosen_admin_code = 'VAELG_DIN_EGEN_ADMIN_KODE'
     or char_length(chosen_admin_code) not between 4 and 64
     or chosen_admin_code !~ '^[A-Za-z0-9]+$' then
    raise exception 'Replace the owner and admin-code placeholders with your own values first.';
  end if;

  select id into owner_id
  from public.profiles
  where lower(nickname) = lower(trim(owner_nickname));

  if owner_id is null then
    raise exception 'The owner nickname does not belong to an existing account.';
  end if;

  update public.admin_users
  set role = 'admin'
  where role = 'owner' and user_id <> owner_id;

  insert into public.admin_users (user_id, access_code_hash, role, failed_attempts, locked_until)
  values (
    owner_id,
    extensions.crypt(chosen_admin_code, extensions.gen_salt('bf')),
    'owner',
    0,
    null
  )
  on conflict (user_id) do update
  set access_code_hash = excluded.access_code_hash,
      role = 'owner',
      failed_attempts = 0,
      locked_until = null;

  foreach admin_nickname in array admin_nicknames loop
    if admin_nickname like 'ADMIN_KALDENAVN_%' then
      raise exception 'Replace or remove every admin nickname placeholder.';
    end if;

    select id into admin_id
    from public.profiles
    where lower(nickname) = lower(trim(admin_nickname));

    if admin_id is null then
      raise exception 'An admin nickname does not belong to an existing account.';
    end if;
    if admin_id = owner_id then
      raise exception 'The owner account must not also be listed as an admin.';
    end if;

    insert into public.admin_users (user_id, access_code_hash, role, failed_attempts, locked_until)
    values (
      admin_id,
      extensions.crypt(chosen_admin_code, extensions.gen_salt('bf')),
      'admin',
      0,
      null
    )
    on conflict (user_id) do update
    set access_code_hash = excluded.access_code_hash,
        role = 'admin',
        failed_attempts = 0,
        locked_until = null;
  end loop;
end;
$$;
