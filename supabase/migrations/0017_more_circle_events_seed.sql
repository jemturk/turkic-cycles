-- More sample events: three past and three upcoming per seeded circle, so the
-- circle page's Upcoming / Past tabs both have something to show. Dates are
-- relative to when this migration is applied, at plausible Tampa local times.

insert into public.circle_events (circle_id, title, description, location, starts_at)
select c.id, e.title, e.description, e.location,
  (date_trunc('day', now() at time zone 'America/New_York') + e.day_offset * interval '1 day' + e.local_time)
    at time zone 'America/New_York'
from (values
  ('tampa-turkiye', -38, time '10:00', 'Turkish Breakfast Brunch', 'A proper kahvaltı spread — simit, peynir, and endless çay.', 'Hyde Park Village, Tampa'),
  ('tampa-turkiye', -17, time '19:00', 'Tavla Night', 'Bring a backgammon board or borrow one. All levels welcome.', 'Seminole Heights, Tampa'),
  ('tampa-turkiye', -6, time '18:30', 'Film Night: Turkish Classics', 'A subtitled screening, plus snacks and discussion.', 'Tampa Theatre'),
  ('tampa-turkiye', 6, time '11:00', 'Bake Sale for Charity', 'Baklava, börek and more — proceeds go to a local charity.', 'Curtis Hixon Park, Tampa'),
  ('tampa-turkiye', 27, time '18:00', 'Republic Day Celebration', 'Music, food and folk dance for Cumhuriyet Bayramı.', 'Tampa Convention Center'),
  ('tampa-turkiye', 41, time '10:00', 'Cooking Class: Mantı', 'Learn to fold tiny dumplings the traditional way.', 'Westshore, Tampa'),

  ('turkic-business-network', -33, time '18:00', 'Startup Pitch Night', 'Five founders, five minutes each, honest feedback.', 'Downtown Tampa'),
  ('turkic-business-network', -19, time '12:00', 'Lunch & Learn: Visas for Founders', 'An immigration attorney walks through the options.', 'Downtown Tampa'),
  ('turkic-business-network', -5, time '08:00', 'Morning Networking Walk', 'Coffee in hand, a loop along the Riverwalk.', 'Tampa Riverwalk'),
  ('turkic-business-network', 8, time '18:30', 'Mentor Speed Matching', 'Meet five experienced mentors in one evening.', 'Channelside, Tampa'),
  ('turkic-business-network', 20, time '12:00', 'Resume Review Clinic', 'Bring your CV and get feedback from hiring managers.', 'Online (Zoom)'),
  ('turkic-business-network', 34, time '19:00', 'Year-End Business Mixer', 'Celebrate the year with founders and professionals.', 'Tampa Heights'),

  ('newcomers', -42, time '10:00', 'Driver''s License 101', 'How to get a Florida license, step by step.', 'Tampa Public Library'),
  ('newcomers', -24, time '11:00', 'Neighborhood Walk: South Tampa', 'A walking tour of where people live, shop and eat.', 'Bayshore Blvd, Tampa'),
  ('newcomers', -10, time '18:00', 'Banking & Credit Basics', 'Opening accounts and building credit from scratch.', 'Online (Zoom)'),
  ('newcomers', 4, time '18:30', 'Welcome Dinner', 'Meet others who just arrived over a shared meal.', 'Ybor City, Tampa'),
  ('newcomers', 15, time '10:00', 'Health Insurance Q&A', 'Plain-language answers about coverage options.', 'Tampa Public Library'),
  ('newcomers', 29, time '11:00', 'Weekend Beach Trip', 'Carpool to the Gulf for a relaxed day out.', 'Clearwater Beach'),

  ('family-travel', -36, time '09:00', 'Zoo Morning', 'Strollers welcome — meet at the main entrance.', 'ZooTampa'),
  ('family-travel', -21, time '10:00', 'Kids'' Turkish Story Hour', 'Stories and songs in Turkish for little ones.', 'Tampa Public Library'),
  ('family-travel', -7, time '09:30', 'Day Trip: Weeki Wachee Springs', 'Kayaking and the mermaid show — carpool from Tampa.', 'Weeki Wachee, FL'),
  ('family-travel', 9, time '11:00', 'Pumpkin Patch Outing', 'Hayrides and pumpkins for the whole family.', 'Plant City, FL'),
  ('family-travel', 23, time '10:00', 'Winter Break Trip Swap', 'Share itineraries and tips for holiday travel.', 'Online (Zoom)'),
  ('family-travel', 38, time '18:30', 'Holiday Lights Walk', 'An evening stroll through the light displays.', 'Downtown Tampa'),

  ('creatives-music', -35, time '19:00', 'Saz Workshop', 'Hands-on intro to the bağlama — instruments provided.', 'Seminole Heights, Tampa'),
  ('creatives-music', -18, time '14:00', 'Ebru Marbling Class', 'Learn traditional Turkish paper marbling.', 'Ybor City, Tampa'),
  ('creatives-music', -4, time '19:30', 'Poetry Reading Night', 'Read your own work or a favorite poet.', 'Hyde Park, Tampa'),
  ('creatives-music', 7, time '19:00', 'Jam Session', 'Bring an instrument — all genres welcome.', 'Ella''s, Tampa'),
  ('creatives-music', 18, time '13:00', 'Sketch Walk', 'Draw the city together, then share over coffee.', 'Tampa Riverwalk'),
  ('creatives-music', 32, time '18:00', 'Winter Showcase', 'Members perform and exhibit their work.', 'Tampa Theatre')
) as e (slug, day_offset, local_time, title, description, location)
join public.circles c on c.slug = e.slug;
