-- The app is now called Halka: the three server messages that named it. Same
-- functions as live (pg_get_functiondef), only the name in the message changed;
-- create or replace keeps their grants.

CREATE OR REPLACE FUNCTION public.create_circle(p_name text, p_description text, p_topic text, p_city text, p_state text, p_country text, p_latitude double precision, p_longitude double precision)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  new_id uuid;
  base_slug text;
begin
  if not public.can_host() then
    raise exception 'Creating circles needs Halka Plus and a verified ID.' using errcode = 'insufficient_privilege';
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
$function$;

CREATE OR REPLACE FUNCTION public.list_incoming_likes()
 RETURNS TABLE(user_id uuid, circle_id uuid, liked_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is null or not public.has_plus(auth.uid()) then
    raise exception 'Halka Plus is required to see who liked you.'
      using errcode = 'insufficient_privilege';
  end if;

  return query
    select l.user_id, l.circle_id, l.liked_at
    from public.pending_incoming_likes() l
    order by l.liked_at desc;
end;
$function$;

CREATE OR REPLACE FUNCTION public.require_adult_birthdate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.birthdate is not null and new.birthdate > (current_date - interval '18 years') then
    raise exception 'You must be 18 or older to use Halka.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$function$;
