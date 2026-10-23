-- Hosting: creating circles and events is for Plus subscribers with a verified ID.
--
--   1. can_host() -- the one rule: Plus (has_plus, 0033) and verification_status
--      'verified'. 'verified' is only ever written server-side (0008: the client
--      can reach 'pending' at most), and so is subscriptions, so neither half can
--      be self-granted. No exception for app admins: they host under the same rule
--      (until Stripe Identity is wired up, set their status to 'verified' by hand).
--   2. create_circle(): can_host() instead of admins only.
--   3. Events: a circle's owners and moderators who can_host(). Owning a circle
--      isn't enough on its own -- a lapsed subscription stops new events until
--      it's renewed. App admins no longer get to add events to any circle.

-- 1 -------------------------------------------------------------------------------

create or replace function public.can_host()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select auth.uid() is not null
    and public.has_plus(auth.uid())
    and exists (select 1 from public.verification_status where user_id = auth.uid() and status = 'verified');
$$;

-- Granted because the circle_events insert policy calls it as the inserting user.
revoke execute on function public.can_host() from public, anon;
grant execute on function public.can_host() to authenticated;

-- 2 -------------------------------------------------------------------------------

create or replace function public.create_circle(
  p_name text,
  p_description text,
  p_topic text,
  p_city text,
  p_state text,
  p_country text,
  p_latitude double precision,
  p_longitude double precision
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_id uuid;
  base_slug text;
begin
  if not public.can_host() then
    raise exception 'Creating circles needs Turkic Circles Plus and a verified ID.' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'A circle needs a name.' using errcode = 'check_violation';
  end if;

  -- "Tampa Turkic Professionals" -> "tampa-turkic-professionals-3f9a1c": readable,
  -- and the random tail keeps it unique even for two circles with the same name.
  base_slug := trim(both '-' from lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g')));
  if base_slug = '' then base_slug := 'circle'; end if;

  insert into public.circles (name, slug, description, topic, city, state, country, latitude, longitude)
  values (
    trim(p_name),
    base_slug || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6),
    nullif(trim(p_description), ''),
    p_topic,
    nullif(trim(p_city), ''),
    nullif(trim(p_state), ''),
    nullif(trim(p_country), ''),
    p_latitude,
    p_longitude
  )
  returning id into new_id;

  -- Runs as the function owner, so it isn't bound by the member-only join policy.
  insert into public.circle_members (circle_id, user_id, role) values (new_id, auth.uid(), 'owner');

  return new_id;
end;
$$;

revoke execute on function public.create_circle(text, text, text, text, text, text, double precision, double precision) from public, anon;
grant execute on function public.create_circle(text, text, text, text, text, text, double precision, double precision) to authenticated;

-- 3 -------------------------------------------------------------------------------

drop policy "circle events are creatable by owners, moderators and admins" on public.circle_events;

create policy "circle events are creatable by hosting owners and moderators"
  on public.circle_events for insert
  to authenticated
  with check (
    public.can_host()
    and exists (
      select 1 from public.circle_members
      where circle_id = circle_events.circle_id and user_id = auth.uid() and role in ('owner', 'moderator')
    )
  );
