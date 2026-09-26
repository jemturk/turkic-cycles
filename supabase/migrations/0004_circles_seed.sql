-- Phase 2 seed data: the 5 circles from the design prototype. member_count starts at 0
-- and grows for real as users join — the prototype's mockup counts (340/210/etc.) are
-- design flavor text, not real data worth faking here.

insert into public.circles (name, slug, description, topic, city, state, country) values
  ('Tampa Türkiye Circle', 'tampa-turkiye', 'Everyday connection for Turks and Turkish-Americans across Tampa Bay — coffee meetups, holiday gatherings, and everything in between.', 'culture', 'Tampa', 'FL', 'USA'),
  ('Turkic Business Network', 'turkic-business-network', 'Founders, professionals & mentors across the diaspora.', 'business', 'Tampa', 'FL', 'USA'),
  ('Newcomers & New Arrivals', 'newcomers', 'Just landed? Find your footing with people who''ve been there.', 'newcomers', 'Tampa', 'FL', 'USA'),
  ('Family & Weekend Travel', 'family-travel', 'Plan trips, share recs, and meet families who love to explore.', 'family', 'Tampa', 'FL', 'USA'),
  ('Creatives & Music', 'creatives-music', 'Painters, musicians & makers keeping culture alive.', 'creative', 'Tampa', 'FL', 'USA');

-- One plausible upcoming event per circle, staggered a few days apart so they read as
-- "upcoming" whenever this migration is actually applied.
insert into public.circle_events (circle_id, title, description, location, starts_at)
select id, 'Tea & Talk meetup', 'Coffee and conversation, all welcome.', 'Kahve Dünyası, Tampa', now() + interval '4 days'
from public.circles where slug = 'tampa-turkiye'
union all
select id, 'Founders Coffee Hour', 'Casual meetup for founders and job-seekers alike.', 'Downtown Tampa', now() + interval '6 days'
from public.circles where slug = 'turkic-business-network'
union all
select id, 'New in Town Meetup', 'Practical tips + friendly faces for recent arrivals.', 'Ulele, Tampa', now() + interval '3 days'
from public.circles where slug = 'newcomers'
union all
select id, 'Family Picnic', 'Bring the kids — potluck at the park.', 'Al Lopez Park, Tampa', now() + interval '9 days'
from public.circles where slug = 'family-travel'
union all
select id, 'Open Mic Night', 'Music, poetry, and art — bring your craft.', 'Ella''s, Tampa', now() + interval '7 days'
from public.circles where slug = 'creatives-music';
