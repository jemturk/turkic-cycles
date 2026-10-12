-- TEMPORARY, for testing: lets an app admin flip their own subscription between
-- free and Plus from Settings. Admins only -- subscriptions stays server-written,
-- so nobody else can give themselves Plus. Drop this function (and the switch in
-- settings/index.tsx) before launch.

create or replace function public.debug_set_my_plus(p_plus boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Only app admins can do this.' using errcode = 'insufficient_privilege';
  end if;

  update public.subscriptions
  set tier = case when p_plus then 'plus' else 'free' end,
      status = 'active',
      current_period_end = null
  where user_id = auth.uid();
end;
$$;

revoke execute on function public.debug_set_my_plus(boolean) from public, anon;
grant execute on function public.debug_set_my_plus(boolean) to authenticated;
