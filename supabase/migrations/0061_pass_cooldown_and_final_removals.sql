-- Matching decisions (Oct 2026), the database side:
--
-- 1. Passes expire: someone you passed on can come back after
--    matching_config.ranking.pass_cooldown_days (30). Likes and saves still keep a
--    person out of your decks for good, as before.
-- 2. Removing a connection stays final: it now records 'removed' both ways (0051 used
--    'pass', which would now expire). A 'removed' answer can't be changed or undone
--    from the app -- liking them from their profile, or Undo, leaves it as it is.
--    Existing removals left mutual passes behind; a pass in both directions is the best
--    trace of one, so those become 'removed' (a pair that passed on each other
--    independently stays hidden from each other too -- an acceptable miss).
-- 3. profile_sensitive.religious_affiliation goes: never collected, and the app asks
--    how important faith is, never which faith.
-- 4. Ranking (rank-discover) scores a bigger pool: up to 200 candidates. The
--    minimum match score isn't enforced while there are few members
--    (ranking.enforce_min_match = false): low scores sort last instead of being hidden.

alter table public.swipes drop constraint swipes_action_check;
alter table public.swipes add constraint swipes_action_check check (action in ('like', 'pass', 'save', 'removed'));

update public.swipes s set action = 'removed'
where s.action = 'pass'
  and exists (
    select 1 from public.swipes r
    where r.actor_id = s.target_id and r.target_id = s.actor_id and r.action = 'pass'
  );

create or replace function public.keep_removal_final()
returns trigger
language plpgsql
as $$
begin
  -- A member's own write (an upsert from Discover or a profile) leaves a removal alone.
  if old.action = 'removed' and coalesce(auth.role(), '') = 'authenticated' then
    return null;
  end if;
  return new;
end;
$$;

revoke execute on function public.keep_removal_final() from public, anon, authenticated;

create trigger swipes_keep_removal_final
  before update on public.swipes
  for each row execute function public.keep_removal_final();

drop policy "undo own recent swipe" on public.swipes;
create policy "undo own recent swipe"
  on public.swipes for delete to authenticated
  using (
    auth.uid() = actor_id
    and action in ('like', 'pass', 'save')
    and updated_at > now() - interval '10 minutes'
    and not exists (
      select 1 from public.matches m
      where (m.user_a = swipes.actor_id and m.user_b = swipes.target_id)
         or (m.user_a = swipes.target_id and m.user_b = swipes.actor_id)
    )
  );

-- 0051's function, recording 'removed' instead of 'pass'.
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
  select pair.actor, pair.target, scope.circle_id, 'removed'
  from (values (a, b), (b, a)) as pair(actor, target)
  cross join (
    select null::uuid as circle_id
    union all
    select ma.circle_id
    from public.circle_members ma
    join public.circle_members mb on mb.circle_id = ma.circle_id and mb.user_id = b
    where ma.user_id = a
  ) as scope
  on conflict on constraint swipes_actor_target_circle_key do update set action = 'removed';

  return true;
end;
$$;

revoke execute on function public.remove_connection(uuid) from public, anon;
grant execute on function public.remove_connection(uuid) to authenticated;

-- How many days a pass keeps someone out of your decks.
create or replace function public.pass_cooldown_days()
returns integer
language sql
security definer set search_path = public
stable
as $$
  select coalesce((select (config -> 'ranking' ->> 'pass_cooldown_days')::int from public.matching_config where active), 30);
$$;

revoke execute on function public.pass_cooldown_days() from public, anon, authenticated;

-- Whether the viewer has already answered the target (in this scope, or any scope when
-- circle_scope is null and every_scope is true): likes, saves and removals for good,
-- passes until they expire.
create or replace function public.has_answered(viewer uuid, target uuid, target_circle uuid, every_scope boolean)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.swipes s
    where s.actor_id = viewer and s.target_id = target
      and (every_scope or s.circle_id is not distinct from target_circle)
      and (s.action <> 'pass' or s.updated_at > now() - make_interval(days => public.pass_cooldown_days()))
  );
$$;

revoke execute on function public.has_answered(uuid, uuid, uuid, boolean) from public, anon, authenticated;

-- 0058's version: passes expire, and up to 200 candidates for ranking.
create or replace function public.list_global_discover_candidates(max_count integer default 20)
returns table (user_id uuid)
language sql
security definer set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.id != auth.uid()
    and p.discoverable
    and p.profile_visibility != 'hidden'
    and p.onboarding_completed_at is not null
    and public.is_visible_person(p.id)
    and not public.is_blocked(auth.uid(), p.id)
    and not public.has_answered(auth.uid(), p.id, null, true)
    and not exists (
      select 1 from public.matches m
      where m.user_a = least(auth.uid(), p.id) and m.user_b = greatest(auth.uid(), p.id)
    )
    and public.passes_discover_filters(auth.uid(), p.id)
  order by random()
  limit least(greatest(max_count, 1), 200);
$$;

-- 0052's version: passes in this circle expire too.
create or replace function public.list_circle_discover_candidates(target_circle uuid)
returns table (user_id uuid)
language sql
security definer set search_path = public
stable
as $$
  select cm.user_id
  from public.circle_members cm
  where cm.circle_id = target_circle
    and cm.user_id != auth.uid()
    and exists (
      select 1 from public.circle_members me
      where me.circle_id = target_circle and me.user_id = auth.uid()
    )
    and public.is_visible_person(cm.user_id)
    and not public.has_answered(auth.uid(), cm.user_id, target_circle, false)
    and public.passes_discover_filters(auth.uid(), cm.user_id);
$$;

-- 0058's version: a pass hides someone's like only until it expires; a removal for good.
create or replace function public.pending_incoming_likes()
returns table (user_id uuid, circle_id uuid, liked_at timestamptz)
language sql
security definer set search_path = public
stable
as $$
  select distinct on (s.actor_id) s.actor_id, s.circle_id, s.updated_at
  from public.swipes s
  join public.profiles p on p.id = s.actor_id
  where auth.uid() is not null
    and s.target_id = auth.uid()
    and s.action = 'like'
    and p.onboarding_completed_at is not null
    and not public.is_blocked(auth.uid(), s.actor_id)
    and public.can_view_profile(s.actor_id)
    and not exists (
      select 1 from public.matches m
      where m.user_a = least(auth.uid(), s.actor_id) and m.user_b = greatest(auth.uid(), s.actor_id)
    )
    and not exists (
      select 1 from public.swipes mine
      where mine.actor_id = auth.uid() and mine.target_id = s.actor_id
        and (mine.action = 'removed'
             or (mine.action = 'pass' and mine.updated_at > now() - make_interval(days => public.pass_cooldown_days())))
    )
  order by s.actor_id, s.updated_at desc;
$$;

alter table public.profile_sensitive drop column religious_affiliation;

update public.matching_config
set config = jsonb_set(config, '{ranking,enforce_min_match}', 'false'::jsonb)
where version = '1.0.0';
