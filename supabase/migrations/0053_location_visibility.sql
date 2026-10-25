-- How much of their location members show others: city and state (default), state
-- only, or country only. In a small community a city plus a name, age and occupation
-- can be enough to find someone, so this is enforced in the database, not just on
-- the cards: profiles.city / profiles.state now hold only what others may see.
--
--   * profile_locations: the real city and state, readable by the member alone.
--   * profiles.city / profiles.state: filled from it by a trigger, per
--     location_visibility. Everything that shows other people (Discover, circles,
--     chat, profiles) reads these, so it gets the masked values with no app change.
--
-- The app keeps writing city/state to profiles as before (onboarding, Edit profile);
-- the trigger takes what was written as the real value. The member's own profile
-- read merges profile_locations back in (src/api/profiles.ts), so their forms show
-- the real values.
--
-- Country stays visible: it's coarse, and matching uses it.

create table public.profile_locations (
  user_id uuid primary key references auth.users (id) on delete cascade,
  city text,
  state text,
  updated_at timestamptz not null default now()
);

alter table public.profile_locations enable row level security;
revoke all on public.profile_locations from anon;

-- Read your own only. Written by the trigger below (definer), never directly.
create policy "own location is readable"
  on public.profile_locations for select to authenticated
  using (auth.uid() = user_id);

alter table public.profiles
  add column location_visibility text not null default 'city'
    check (location_visibility in ('city', 'state', 'country'));

create or replace function public.mask_profile_location()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  real_city text;
  real_state text;
begin
  -- A city/state the statement wrote is the real value; otherwise keep the stored one
  -- (the public columns may be masked, so they can't be trusted as the real value).
  select pl.city, pl.state into real_city, real_state
  from public.profile_locations pl where pl.user_id = new.id;

  if tg_op = 'INSERT' or new.city is distinct from old.city then
    real_city := new.city;
  end if;
  if tg_op = 'INSERT' or new.state is distinct from old.state then
    real_state := new.state;
  end if;

  insert into public.profile_locations (user_id, city, state)
  values (new.id, real_city, real_state)
  on conflict (user_id) do update
    set city = excluded.city, state = excluded.state, updated_at = now();

  new.city := case when new.location_visibility = 'city' then real_city end;
  new.state := case when new.location_visibility in ('city', 'state') then real_state end;
  return new;
end;
$$;

revoke execute on function public.mask_profile_location() from public, anon, authenticated;

create trigger profiles_mask_location
  before insert or update of city, state, location_visibility on public.profiles
  for each row execute function public.mask_profile_location();

-- Everyone's current location becomes their real location; visibility starts at
-- 'city', so nothing anyone sees changes until they pick otherwise.
insert into public.profile_locations (user_id, city, state)
select id, city, state from public.profiles
on conflict (user_id) do nothing;
