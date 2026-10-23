-- Discover filters from data people have already given (matching model v1, stage 1):
-- both Discover decks -- the global tab and a circle's deck -- now leave out people
-- who fail any of these, checked in both directions:
--
--   * no connection type in common;
--   * no language in common. Your "Show me speakers of" languages (matching
--     preferences) stand in for your profile's languages when you've set any;
--   * outside each other's age range, where one is set;
--   * either of you has reported the other.
--
-- Distance waits for coordinates on profiles (stage 3).
--
-- matching_preferences stays self-only: these functions read the other person's
-- preferences as the definer and return only ids, never the values. What you can
-- infer -- someone not showing up -- is the point of a filter.
--
-- The circle deck moves server-side for this: the client can't read other people's
-- preferences, so it can't apply the filters itself.

create or replace function public.passes_discover_filters(viewer uuid, target uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  with people as (
    select
      p.id,
      case when coalesce(cardinality(mp.languages), 0) > 0 then mp.languages else p.languages end as wanted_languages,
      p.languages,
      extract(year from age(p.birthdate))::int as age,
      mp.age_min,
      mp.age_max
    from public.profiles p
    left join public.matching_preferences mp on mp.user_id = p.id
    where p.id in (viewer, target)
  ),
  v as (select * from people where id = viewer),
  t as (select * from people where id = target)
  select
    exists (
      select 1
      from public.user_connection_types a
      join public.user_connection_types b on b.connection_type = a.connection_type
      where a.user_id = viewer and b.user_id = target
    )
    and (select t.languages && v.wanted_languages and v.languages && t.wanted_languages from v, t)
    and (select
           (t.age is null or ((v.age_min is null or t.age >= v.age_min) and (v.age_max is null or t.age <= v.age_max)))
           and (v.age is null or ((t.age_min is null or v.age >= t.age_min) and (t.age_max is null or v.age <= t.age_max)))
         from v, t)
    and not exists (
      select 1 from public.reports r
      where (r.reporter_id = viewer and r.reported_user_id = target)
         or (r.reporter_id = target and r.reported_user_id = viewer)
    );
$$;

-- Only the Discover functions below call it; granted to nobody, so nobody can probe
-- someone else's age range with it directly.
revoke execute on function public.passes_discover_filters(uuid, uuid) from public, anon, authenticated;

-- 0042's version plus the filters.
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
    and p.deletion_requested_at is null
    and public.is_visible_person(p.id)
    and not public.is_blocked(auth.uid(), p.id)
    and not exists (
      select 1 from public.swipes s
      where s.actor_id = auth.uid() and s.target_id = p.id
    )
    and not exists (
      select 1 from public.matches m
      where m.user_a = least(auth.uid(), p.id) and m.user_b = greatest(auth.uid(), p.id)
    )
    and public.passes_discover_filters(auth.uid(), p.id)
  order by random()
  limit least(greatest(max_count, 1), 50);
$$;

-- A circle's deck: the circle's other members you haven't swiped on there, filtered.
-- Same rows the client used to pick itself (listDiscoverCandidates), which also
-- leaves blocked and hidden people to the profile reads that follow, as before.
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
    and not exists (
      select 1 from public.swipes s
      where s.actor_id = auth.uid() and s.target_id = cm.user_id and s.circle_id = target_circle
    )
    and public.passes_discover_filters(auth.uid(), cm.user_id);
$$;

revoke execute on function public.list_circle_discover_candidates(uuid) from public, anon;
grant execute on function public.list_circle_discover_candidates(uuid) to authenticated;
