-- Who can create circles and events, and closing a role gap.
--
--   1. Joining a circle always makes you a 'member'. The old policy only checked
--      that you were adding yourself, so a hand-written API request could join any
--      circle as 'owner' -- and owners can create events.
--   2. App admins: a table only the database can write (no client insert/update
--      policies), so nobody can make themselves an admin. A plain profiles column
--      wouldn't do: users can update their own profile row.
--   3. create_circle(): admins only. Creates the circle with a unique slug and makes
--      the creator its owner, in one transaction.
--   4. Events: a circle's owners and moderators (as before) plus app admins.
--
-- To make yourself an admin, run once in the SQL editor (with your account's email):
--   insert into public.app_admins (user_id)
--   select id from auth.users where email = 'you@example.com';

-- 1 -------------------------------------------------------------------------------

drop policy "join a circle as self" on public.circle_members;

create policy "join a circle as a member"
  on public.circle_members for insert
  to authenticated
  with check (auth.uid() = user_id and role = 'member');

-- 2 -------------------------------------------------------------------------------

create table public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

-- Lets the app show admin-only controls to the admin; no one can see the list.
create policy "own admin status is readable"
  on public.app_admins for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.is_app_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select auth.uid() is not null and exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

revoke execute on function public.is_app_admin() from public, anon;
grant execute on function public.is_app_admin() to authenticated;

-- 3 -------------------------------------------------------------------------------

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
  if not public.is_app_admin() then
    raise exception 'Only app admins can create circles.' using errcode = 'insufficient_privilege';
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

-- 4 -------------------------------------------------------------------------------

drop policy "circle events are creatable by owners and moderators" on public.circle_events;

create policy "circle events are creatable by owners, moderators and admins"
  on public.circle_events for insert
  to authenticated
  with check (
    public.is_app_admin()
    or exists (
      select 1 from public.circle_members
      where circle_id = circle_events.circle_id and user_id = auth.uid() and role in ('owner', 'moderator')
    )
  );
