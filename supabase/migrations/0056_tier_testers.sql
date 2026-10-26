-- A temporary tier switch for named testers: a Settings card where they set their own
-- subscription tier (Free / Plus / Premium) to try what each tier gets, without a
-- purchase. The switch from 0036 was removed in 0047; this brings back the tier part
-- only (no Verified switch -- the badge has to mean an ID check), for a separate list
-- rather than test_accounts, which would also show them the sample members (0042).
--
-- tier_testers is readable by no member; add or remove people with SQL:
--   insert into public.tier_testers (user_id) select id from auth.users where email = '...';
--   delete from public.tier_testers where user_id = (select id from auth.users where email = '...');
-- A purchase or restore re-syncs the tier from RevenueCat (sync-subscription) and
-- replaces whatever was switched.

create table public.tier_testers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table public.tier_testers enable row level security;
revoke all on public.tier_testers from anon, authenticated;

create or replace function public.is_tier_tester()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from public.tier_testers where user_id = auth.uid());
$$;

revoke execute on function public.is_tier_tester() from public, anon;
grant execute on function public.is_tier_tester() to authenticated;

create or replace function public.set_my_test_tier(p_tier text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_tier_tester() then
    raise exception 'Only tier testers can do this.' using errcode = 'insufficient_privilege';
  end if;
  if p_tier not in ('free', 'plus', 'premium') then
    raise exception 'Unknown tier: %', p_tier using errcode = 'check_violation';
  end if;

  update public.subscriptions
  set tier = p_tier, status = 'active', current_period_end = null
  where user_id = auth.uid();
end;
$$;

revoke execute on function public.set_my_test_tier(text) from public, anon;
grant execute on function public.set_my_test_tier(text) to authenticated;

insert into public.tier_testers (user_id)
select id from auth.users where email in ('unturkk@gmail.com', 'yaseminbulkeley@gmail.com')
on conflict do nothing;
