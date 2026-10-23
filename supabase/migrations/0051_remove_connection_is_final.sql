-- Remove connection is final, both ways, everywhere (replaces 0050's function).
--
-- Likes and passes are kept per scope -- the global Discover tab (circle_id null) and
-- each circle's "Meet members" -- so after 0050 the two could still meet again in a
-- shared circle's deck and match there. Now removing a connection also:
--
--   * deletes every connection between the two (not only the one removed: they could
--     have matched in Discover and in a circle);
--   * records a pass both ways, in Discover and in every circle they share, so neither
--     is shown to the other in any deck again (the decks leave out anyone answered).
--
-- They can still see each other in shared circles and events; only matching closes.
-- A pass never makes a match (handle_reciprocal_like only acts on likes).

create or replace function public.remove_connection(p_match_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  a uuid;
  b uuid;
begin
  select user_a, user_b into a, b
  from public.matches
  where id = p_match_id and auth.uid() in (user_a, user_b);
  if a is null then
    return false;
  end if;

  delete from public.matches
  where (user_a = a and user_b = b) or (user_a = b and user_b = a);

  insert into public.swipes (actor_id, target_id, circle_id, action)
  select pair.actor, pair.target, scope.circle_id, 'pass'
  from (values (a, b), (b, a)) as pair(actor, target)
  cross join (
    select null::uuid as circle_id
    union all
    select ma.circle_id
    from public.circle_members ma
    join public.circle_members mb on mb.circle_id = ma.circle_id and mb.user_id = b
    where ma.user_id = a
  ) as scope
  on conflict on constraint swipes_actor_target_circle_key do update set action = 'pass';

  return true;
end;
$$;

revoke execute on function public.remove_connection(uuid) from public, anon;
grant execute on function public.remove_connection(uuid) to authenticated;
