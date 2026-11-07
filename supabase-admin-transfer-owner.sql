-- Run after supabase-admin-management.sql.
-- Transfers the Owner role to the existing "valde" account without changing its admin code.
do $$
declare
  target_user_id uuid;
begin
  select id
  into target_user_id
  from public.profiles
  where lower(nickname) = 'valde';

  if target_user_id is null then
    raise exception 'No profile with nickname "valde" exists.';
  end if;

  if not exists (
    select 1
    from public.admin_users
    where user_id = target_user_id
  ) then
    raise exception 'The "valde" account does not have admin access yet.';
  end if;

  update public.admin_users
  set role = 'admin'
  where role = 'owner'
    and user_id <> target_user_id;

  update public.admin_users
  set role = 'owner'
  where user_id = target_user_id;
end;
$$;
