-- One-off: look up the coordinates of every member who already has a city, now that
-- geocode-location is deployed and has its key (0059 only reacts to changes). Each
-- request carries just the member's id, like the trigger's; the function skips any
-- place already looked up, so running this again is harmless.
select net.http_post(
  url := 'https://mpcfakrdgqzcofscnwvu.supabase.co/functions/v1/geocode-location',
  headers := jsonb_build_object('Content-Type', 'application/json'),
  body := jsonb_build_object('type', 'UPDATE', 'table', 'profiles', 'record', jsonb_build_object('id', pl.user_id)),
  timeout_milliseconds := 10000
)
from public.profile_locations pl
where pl.city is not null and pl.latitude is null;
