-- The top tier is renamed business_circle -> premium, and the temporary admin test
-- controls in Settings grow from a Free/Plus switch to Free/Plus/Premium plus a
-- Verified switch.
--
--   1. subscriptions.tier: 'free' | 'plus' | 'premium'. The RevenueCat entitlement
--      is renamed to match (supabase/functions/_shared/revenuecat.ts).
--   2. has_plus(): premium includes everything in Plus.
--   3. TEMPORARY, for testing -- admins only, own row only. Drop both functions
--      (and the controls in settings/index.tsx) before launch:
--        debug_set_my_tier(text) replaces 0034's debug_set_my_plus(boolean);
--        debug_set_my_verified(boolean) sets verification_status, which otherwise
--        only the server writes (0008), so it's the stand-in for Stripe Identity.

-- 1 -------------------------------------------------------------------------------

alter table public.subscriptions drop constraint subscriptions_tier_check;
update public.subscriptions set tier = 'premium' where tier = 'business_circle';
alter table public.subscriptions
  add constraint subscriptions_tier_check check (tier in ('free', 'plus', 'premium'));

-- 2 -------------------------------------------------------------------------------
-- current_period_end is a backstop for a missed EXPIRATION webhook: a lapsed row
-- stops counting on its own.

create or replace function public.has_plus(uid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid
      and s.tier in ('plus', 'premium')
      and s.status != 'canceled'
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

-- 3 -------------------------------------------------------------------------------

drop function public.debug_set_my_plus(boolean);

create or replace function public.debug_set_my_tier(p_tier text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Only app admins can do this.' using errcode = 'insufficient_privilege';
  end if;
  if p_tier not in ('free', 'plus', 'premium') then
    raise exception 'Unknown tier: %', p_tier using errcode = 'check_violation';
  end if;

  update public.subscriptions
  set tier = p_tier,
      status = 'active',
      current_period_end = null
  where user_id = auth.uid();
end;
$$;

revoke execute on function public.debug_set_my_tier(text) from public, anon;
grant execute on function public.debug_set_my_tier(text) to authenticated;

create or replace function public.debug_set_my_verified(p_verified boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'Only app admins can do this.' using errcode = 'insufficient_privilege';
  end if;

  insert into public.verification_status (user_id, status)
  values (auth.uid(), case when p_verified then 'verified' else 'unverified' end)
  on conflict (user_id) do update set status = excluded.status;
end;
$$;

revoke execute on function public.debug_set_my_verified(boolean) from public, anon;
grant execute on function public.debug_set_my_verified(boolean) to authenticated;
