-- Global Discover: a Discover tab where anyone can come across anyone, alongside the
-- existing circle-scoped "Meet members" Discover (which keeps working unchanged).
--
--   1. profiles.discoverable -- opt-out switch, on by default.
--   2. swipes/matches: circle_id becomes nullable; null = the global scope.
--   3. One connection per pair: a pair already matched anywhere never gets a second
--      match row (which would show up as a duplicate card in Connections).
--   4. can_view_profile(): the single "may the caller see this person" rule, replacing
--      the circle-mates-only check on profiles and everything shown with them.
--   5. list_global_discover_candidates(): random for now; a matching algorithm can
--      replace its ORDER BY later without an app update.

-- 1 -------------------------------------------------------------------------------

alter table public.profiles add column discoverable boolean not null default true;

-- 2 -------------------------------------------------------------------------------
-- A primary key can't include a nullable column, so the composite PKs become unique
-- constraints. NULLS NOT DISTINCT (Postgres 15+) keeps "one global swipe per pair"
-- unique, and still lets recordSwipe's upsert use (actor_id, target_id, circle_id)
-- as its conflict target.

alter table public.swipes drop constraint swipes_pkey;
alter table public.swipes alter column circle_id drop not null;
alter table public.swipes
  add constraint swipes_actor_target_circle_key unique nulls not distinct (actor_id, target_id, circle_id);

alter table public.matches drop constraint matches_pkey;
alter table public.matches alter column circle_id drop not null;
alter table public.matches add constraint matches_pkey primary key (id);
alter table public.matches
  add constraint matches_pair_circle_key unique nulls not distinct (user_a, user_b, circle_id);

-- 3 -------------------------------------------------------------------------------
-- A like matches a reverse like from the same circle (unchanged), and a global like
-- pairs with a reverse like from any scope -- liking someone on the Discover tab who
-- already liked you in a circle is still mutual. Two likes in two different circles
-- stay separate, as before.

create or replace function public.handle_reciprocal_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  reverse_exists boolean;
begin
  if new.action != 'like' then
    return new;
  end if;

  if exists (
    select 1 from public.matches
    where user_a = least(new.actor_id, new.target_id) and user_b = greatest(new.actor_id, new.target_id)
  ) then
    return new;
  end if;

  select exists (
    select 1 from public.swipes
    where actor_id = new.target_id and target_id = new.actor_id and action = 'like'
      and (circle_id is not distinct from new.circle_id or circle_id is null or new.circle_id is null)
  ) into reverse_exists;

  if reverse_exists then
    insert into public.matches (user_a, user_b, circle_id)
    values (least(new.actor_id, new.target_id), greatest(new.actor_id, new.target_id), new.circle_id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

-- 4 -------------------------------------------------------------------------------
-- Visible = yourself, or not hidden AND (discoverable, or a circle-mate, or someone
-- you're matched with). The match clause keeps a chat working after one side turns
-- discoverable off, even if the two never shared a circle.
--
-- security definer so the lookups inside skip RLS -- otherwise this would recurse
-- into the very profiles policy that calls it.

create or replace function public.can_view_profile(target uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select target = auth.uid() or exists (
    select 1 from public.profiles p
    where p.id = target
      and p.profile_visibility != 'hidden'
      and (
        p.discoverable
        or exists (
          select 1 from public.circle_members cm1
          join public.circle_members cm2 on cm1.circle_id = cm2.circle_id
          where cm1.user_id = auth.uid() and cm2.user_id = target
        )
        or exists (
          select 1 from public.matches m
          where m.user_a = least(auth.uid(), target) and m.user_b = greatest(auth.uid(), target)
        )
      )
  );
$$;

grant execute on function public.can_view_profile(uuid) to authenticated;

drop policy "circle-mates' profiles are readable" on public.profiles;
create policy "visible profiles are readable"
  on public.profiles for select
  using (public.can_view_profile(id));

drop policy "circle-mates' connection types are readable" on public.user_connection_types;
create policy "visible users' connection types are readable"
  on public.user_connection_types for select
  using (public.can_view_profile(user_id));

drop policy "circle-mates' verification status is readable" on public.verification_status;
create policy "visible users' verification status is readable"
  on public.verification_status for select
  using (public.can_view_profile(user_id));

drop policy "circle-mates' profile photos are readable" on public.profile_photos;
create policy "visible users' profile photos are readable"
  on public.profile_photos for select
  using (public.can_view_profile(user_id));

-- Same consent requirement as before; only the circle-mates check widens.
create or replace function public.get_origin_countries_with_consent(target_ids uuid[])
returns table (user_id uuid, origin_countries text[])
language sql
security definer set search_path = public
as $$
  select ps.user_id, ps.origin_countries
  from public.profile_sensitive ps
  where ps.user_id = any(target_ids)
    and public.can_view_profile(ps.user_id)
    and exists (
      select 1 from public.consent_records cr
      where cr.user_id = ps.user_id and cr.field_key = 'origin_countries'
        and cr.purpose = 'matching' and cr.granted = true and cr.revoked_at is null
    );
$$;

-- 5 -------------------------------------------------------------------------------
-- Skips anyone you've already swiped on in any scope or are already matched with,
-- plus hidden, opted-out, blocked, unfinished and pending-deletion profiles.

create or replace function public.list_global_discover_candidates(max_count int default 20)
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
    and p.deletion_requested_at is null
    and not public.is_blocked(auth.uid(), p.id)
    and not exists (
      select 1 from public.swipes s
      where s.actor_id = auth.uid() and s.target_id = p.id
    )
    and not exists (
      select 1 from public.matches m
      where m.user_a = least(auth.uid(), p.id) and m.user_b = greatest(auth.uid(), p.id)
    )
  order by random()
  limit least(greatest(max_count, 1), 50);
$$;

grant execute on function public.list_global_discover_candidates(int) to authenticated;
