-- Matching model v1, stage 3 (the parts no open decision blocks):
--
-- 1. How members like to meet: profiles.meeting_format (in_person / virtual / either,
--    asked of everyone) and profiles.availability (weekday_daytime, weekday_evening,
--    weekend). Goals per type and Business industry / expertise live in
--    questionnaire_responses.answers with the rest of each type's answers.
--
-- 2. Coordinates for the distance filter (and proximity scoring later), from the
--    member's city: profile_locations.latitude / longitude, readable by the member
--    alone like the rest of that table (0053). When city, state or country changes,
--    pg_net asks the geocode-location Edge Function to look the place up (Google
--    Geocoding, a city-level centre point -- never the device's location) and write
--    them back. The function skips a place it has already looked up.
--
-- 3. Discover's filters (0052) gain distance, both ways: when both have coordinates,
--    each must be within the other's max distance (matching preferences), where set.
--    No coordinates yet = no distance filter, so nothing changes until places are
--    geocoded.

alter table public.profiles
  add column meeting_format text check (meeting_format in ('in_person', 'virtual', 'either')),
  add column availability text[] not null default '{}'
    check (availability <@ array['weekday_daytime', 'weekday_evening', 'weekend']);

alter table public.profile_locations
  add column latitude double precision,
  add column longitude double precision,
  add column geocoded_query text,
  add column geocoded_at timestamptz;

create or replace function public.request_geocode()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://mpcfakrdgqzcofscnwvu.supabase.co/functions/v1/geocode-location',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('type', 'UPDATE', 'table', 'profiles', 'record', jsonb_build_object('id', new.id)),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

revoke execute on function public.request_geocode() from public, anon, authenticated;

-- After mask_profile_location (a BEFORE trigger) has stored the real city / state.
create trigger profiles_request_geocode
  after insert or update of city, state, country on public.profiles
  for each row execute function public.request_geocode();

create or replace function public.miles_between(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
returns double precision
language sql
immutable
as $$
  select 3958.8 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)
  ));
$$;

revoke execute on function public.miles_between(double precision, double precision, double precision, double precision) from public, anon, authenticated;

-- 0052's version plus distance.
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
      mp.age_max,
      mp.max_distance_miles,
      pl.latitude,
      pl.longitude
    from public.profiles p
    left join public.matching_preferences mp on mp.user_id = p.id
    left join public.profile_locations pl on pl.user_id = p.id
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
    and (select
           v.latitude is null or t.latitude is null
           or (
             (v.max_distance_miles is null or public.miles_between(v.latitude, v.longitude, t.latitude, t.longitude) <= v.max_distance_miles)
             and (t.max_distance_miles is null or public.miles_between(v.latitude, v.longitude, t.latitude, t.longitude) <= t.max_distance_miles)
           )
         from v, t)
    and not exists (
      select 1 from public.reports r
      where (r.reporter_id = viewer and r.reported_user_id = target)
         or (r.reporter_id = target and r.reported_user_id = viewer)
    );
$$;

revoke execute on function public.passes_discover_filters(uuid, uuid) from public, anon, authenticated;
