-- "Remove connection" (unmatch): either person can end a connection without blocking.
-- The match is deleted, and its messages and reactions with it (they cascade from
-- matches, 0007 / 0038) -- for both people, as in most apps; the other person isn't
-- told. Neither shows up in the other's Discover again: both of their likes stay,
-- and Discover leaves out people you've already answered.
--
-- matches has no client delete policy (only handle_reciprocal_like writes it), so
-- this is a security definer function that checks the caller is one of the two.

create or replace function public.remove_connection(p_match_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  removed int;
begin
  delete from public.matches
  where id = p_match_id and auth.uid() in (user_a, user_b);
  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

revoke execute on function public.remove_connection(uuid) from public, anon;
grant execute on function public.remove_connection(uuid) to authenticated;
