-- The testers' card (0056) gets a Verified switch too: tier testers can turn their own
-- Verified badge on and off, to see how verified and unverified members look and what
-- verification unlocks (hosting circles needs it). Same list, same refusal for anyone
-- else. Real members still only get the badge from Stripe Identity (0043).

create or replace function public.set_my_test_verified(p_verified boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_tier_tester() then
    raise exception 'Only tier testers can do this.' using errcode = 'insufficient_privilege';
  end if;

  insert into public.verification_status (user_id, status)
  values (auth.uid(), case when p_verified then 'verified' else 'unverified' end)
  on conflict (user_id) do update set status = excluded.status, updated_at = now();
end;
$$;

revoke execute on function public.set_my_test_verified(boolean) from public, anon;
grant execute on function public.set_my_test_verified(boolean) to authenticated;
