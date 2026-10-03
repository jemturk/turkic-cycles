-- Coordinates on circle events, for the circles page's "Local" (within 50 miles)
-- filter. Null means the event has no physical location (e.g. online), which the
-- app treats as available from anywhere.
alter table public.circle_events
  add column latitude double precision,
  add column longitude double precision;

-- Backfill the seeded events. They're all around Tampa, so the city center is
-- close enough for a 50-mile filter, except the few day trips farther out.
update public.circle_events set
  latitude = case
    when location = 'Clearwater Beach' then 27.9775
    when location = 'Weeki Wachee, FL' then 28.5164
    when location = 'Plant City, FL' then 28.0186
    else 27.9506
  end,
  longitude = case
    when location = 'Clearwater Beach' then -82.8271
    when location = 'Weeki Wachee, FL' then -82.5726
    when location = 'Plant City, FL' then -82.1129
    else -82.4572
  end
where location is not null and location not like 'Online%';

-- Sample events around Apex, NC (Raleigh–Durham–Cary area): one past and two
-- upcoming per circle, dated relative to when this migration is applied.
insert into public.circle_events (circle_id, title, description, location, latitude, longitude, starts_at)
select c.id, e.title, e.description, e.location, e.latitude, e.longitude,
  (date_trunc('day', now() at time zone 'America/New_York') + e.day_offset * interval '1 day' + e.local_time)
    at time zone 'America/New_York'
from (values
  ('tampa-turkiye', -12, time '18:00', 'Apex Çay Social', 'Tea and conversation for the Triangle''s Turkish community.', 'Downtown Apex, NC', 35.7327, -78.8503),
  ('tampa-turkiye', 10, time '11:00', 'Turkish Breakfast in Cary', 'A kahvaltı brunch — bring friends and family.', 'Cary, NC', 35.7915, -78.7811),
  ('tampa-turkiye', 27, time '12:00', 'Republic Day Picnic (Triangle)', 'A Cumhuriyet Bayramı picnic for families across the Triangle.', 'Apex Community Park, Apex, NC', 35.7134, -78.8396),

  ('turkic-business-network', -9, time '18:30', 'Triangle Founders Meetup', 'Founders and operators from Raleigh, Durham and Cary.', 'Raleigh, NC', 35.7796, -78.6382),
  ('turkic-business-network', 12, time '12:00', 'Lunch & Learn: Fundraising Basics', 'How first funding rounds actually come together.', 'Durham, NC', 35.9940, -78.8986),
  ('turkic-business-network', 26, time '18:00', 'Apex Business Mixer', 'Casual drinks with professionals across the diaspora.', 'Downtown Apex, NC', 35.7327, -78.8503),

  ('newcomers', -14, time '10:00', 'Settling In: Apex & Cary', 'Schools, housing and paperwork tips from locals.', 'Apex, NC', 35.7327, -78.8503),
  ('newcomers', 5, time '18:30', 'Newcomers Dinner (Triangle)', 'Meet other recent arrivals over dinner.', 'Cary, NC', 35.7915, -78.7811),
  ('newcomers', 19, time '10:00', 'Raleigh City Walk', 'A guided walk through downtown Raleigh.', 'Raleigh, NC', 35.7796, -78.6382),

  ('family-travel', -16, time '10:00', 'Farmers Market Morning', 'Strollers welcome — meet by the market entrance.', 'Downtown Apex, NC', 35.7327, -78.8503),
  ('family-travel', 8, time '10:00', 'Lake Johnson Paddle', 'Kayaks and a picnic on the lake.', 'Lake Johnson Park, Raleigh, NC', 35.7615, -78.7130),
  ('family-travel', 22, time '16:00', 'Kids'' Halloween Parade', 'Costumes and candy along Salem Street.', 'Downtown Apex, NC', 35.7327, -78.8503),

  ('creatives-music', -11, time '19:00', 'Open Studio Night', 'Members share their works in progress.', 'Durham, NC', 35.9940, -78.8986),
  ('creatives-music', 6, time '19:30', 'Saz & Strings Jam', 'Acoustic jam — all instruments welcome.', 'Downtown Apex, NC', 35.7327, -78.8503),
  ('creatives-music', 21, time '14:00', 'Ebru Workshop (Triangle)', 'Traditional paper marbling, materials provided.', 'Cary, NC', 35.7915, -78.7811)
) as e (slug, day_offset, local_time, title, description, location, latitude, longitude)
join public.circles c on c.slug = e.slug;
