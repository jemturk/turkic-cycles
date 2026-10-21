-- Undo in Discover: a member can take back their own like, pass or save shortly
-- after making it (DiscoverDeck shows Undo for a few seconds). Swipes had no delete
-- policy at all; this one is kept to that purpose:
--
--   * only your own swipe, and only within 10 minutes of making (or changing) it;
--   * not once it has made a match -- the other person has been told by then, so
--     taking the like back would leave them matched with someone who didn't mean it.
--
-- updated_at is set on insert and on every change (0006's trigger).

create policy "undo own recent swipe"
  on public.swipes for delete to authenticated
  using (
    auth.uid() = actor_id
    and updated_at > now() - interval '10 minutes'
    and not exists (
      select 1 from public.matches m
      where (m.user_a = swipes.actor_id and m.user_b = swipes.target_id)
         or (m.user_a = swipes.target_id and m.user_b = swipes.actor_id)
    )
  );
