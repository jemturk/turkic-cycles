-- The circles page's "Local" switch filters circles (not events) to those within
-- 50 miles, so coordinates move from events to circles.
alter table public.circles
  add column latitude double precision,
  add column longitude double precision;

-- The original seeded circles are all Tampa-based.
update public.circles set latitude = 27.9506, longitude = -82.4572
where slug in ('tampa-turkiye', 'turkic-business-network', 'newcomers', 'family-travel', 'creatives-music');

-- Sample circles around Apex, NC (Raleigh–Durham–Cary area), one per topic.
insert into public.circles (name, slug, description, topic, city, state, country, latitude, longitude) values
  ('Triangle Türk Community', 'triangle-turkish', 'Turks and Turkish-Americans across Raleigh, Durham, Cary and Apex — çay, holidays and good company.', 'culture', 'Apex', 'NC', 'USA', 35.7327, -78.8503),
  ('Triangle Turkic Professionals', 'triangle-professionals', 'Founders, engineers and mentors across the Research Triangle.', 'business', 'Raleigh', 'NC', 'USA', 35.7796, -78.6382),
  ('New to the Triangle', 'triangle-newcomers', 'Just moved to the area? Settle in with people who''ve done it.', 'newcomers', 'Cary', 'NC', 'USA', 35.7915, -78.7811),
  ('Apex Family Adventures', 'apex-families', 'Playdates, day trips and weekend plans for families.', 'family', 'Apex', 'NC', 'USA', 35.7327, -78.8503),
  ('Triangle Arts & Music', 'triangle-arts', 'Musicians, painters and makers sharing culture in the Triangle.', 'creative', 'Durham', 'NC', 'USA', 35.9940, -78.8986);

-- The Apex-area events from 0018 were attached to the Tampa circles; move each to
-- the new Triangle circle with the same topic. They're the only NC events, i.e.
-- the only ones north of 34°N.
update public.circle_events e
set circle_id = apex.id
from public.circles tampa
join public.circles apex on apex.topic = tampa.topic and apex.state = 'NC'
where e.circle_id = tampa.id and tampa.state = 'FL' and e.latitude > 34;

alter table public.circle_events
  drop column latitude,
  drop column longitude;
