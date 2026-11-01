-- The seeded circles and their events (0004, 0017, 0019) become a sample world for test
-- accounts only, like the mock profiles (0042): real members only ever see circles
-- real people made, never invented meetups they might turn up to. Testers and App
-- Review keep a busy world, and it stays current:
--   * sample_circles: the seeded circles, a private list (RLS on, no policies) read
--     only through is_visible_circle.
--   * circles, events, member lists and joining check is_visible_circle.
--   * Real members who had joined a sample circle are taken out of it (testers stay).
--   * In sample circles the member and going / interested counts include the mock
--     profiles, since only testers, who see those profiles, see these circles.
--   * refresh_sample_world (daily, 04:23 UTC) moves sample events that ended more than
--     8 weeks ago forward by whole 12-week cycles, keeping their weekday and local
--     time, so each circle always has upcoming events; and keeps the mock accounts'
--     safety plans a few days ahead.
--   * Seasonal sample events get year-round names (they now come round every 12
--     weeks), and every sample event moves 3 weeks forward so most circles have
--     something coming up from today.

create table public.sample_circles (
  circle_id uuid primary key references public.circles (id) on delete cascade
);
alter table public.sample_circles enable row level security;

insert into public.sample_circles (circle_id)
select id from public.circles
where slug in (
  'tampa-turkiye', 'turkic-business-network', 'newcomers', 'family-travel', 'creatives-music',
  'triangle-turkish', 'triangle-professionals', 'triangle-newcomers', 'apex-families', 'triangle-arts'
);

-- Whether the signed-in user may see `target`: every real circle, a sample one only
-- for testers.
create or replace function public.is_visible_circle(target uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select auth.uid() is not null and (
    not exists (select 1 from public.sample_circles where circle_id = target)
    or public.sees_mocks()
  );
$$;

revoke execute on function public.is_visible_circle(uuid) from public, anon;
grant execute on function public.is_visible_circle(uuid) to authenticated;

drop policy "circles are readable by authenticated users" on public.circles;
create policy "circles are readable by authenticated users"
  on public.circles for select
  to authenticated
  using (public.is_visible_circle(id));

drop policy "circle events are readable" on public.circle_events;
create policy "circle events are readable"
  on public.circle_events for select
  to authenticated
  using (public.is_visible_circle(circle_id));

drop policy "circle members are readable" on public.circle_members;
create policy "circle members are readable"
  on public.circle_members for select
  to authenticated
  using (public.is_visible_person(user_id) and public.is_visible_circle(circle_id));

drop policy "join a circle as a member" on public.circle_members;
create policy "join a circle as a member"
  on public.circle_members for insert
  to authenticated
  with check (auth.uid() = user_id and role = 'member' and public.is_visible_circle(circle_id));

-- Real members who joined a sample circle leave it (and its events).
delete from public.event_rsvps r
using public.circle_events e, public.sample_circles s
where e.id = r.event_id and s.circle_id = e.circle_id
  and not exists (select 1 from public.mock_users mu where mu.user_id = r.user_id)
  and not exists (select 1 from public.test_accounts t where t.user_id = r.user_id);

delete from public.circle_members cm
using public.sample_circles s
where s.circle_id = cm.circle_id
  and not exists (select 1 from public.mock_users mu where mu.user_id = cm.user_id)
  and not exists (select 1 from public.test_accounts t where t.user_id = cm.user_id);

-- Counts: real members only, except in sample circles, where everyone counts.
create or replace function public.update_circle_member_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target uuid;
begin
  target := case when tg_op = 'DELETE' then old.circle_id else new.circle_id end;
  update public.circles set member_count = (
    select count(*) from public.circle_members cm
    where cm.circle_id = target
      and (
        exists (select 1 from public.sample_circles s where s.circle_id = target)
        or not exists (select 1 from public.mock_users mu where mu.user_id = cm.user_id)
      )
  )
  where id = target;
  return null;
end;
$$;

create or replace function public.update_event_rsvp_counts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target uuid;
  sample boolean;
begin
  target := case when tg_op = 'DELETE' then old.event_id else new.event_id end;
  select exists (
    select 1 from public.circle_events e join public.sample_circles s on s.circle_id = e.circle_id
    where e.id = target
  ) into sample;
  update public.circle_events set
    going_count = (
      select count(*) from public.event_rsvps r
      where r.event_id = target and r.status = 'going'
        and (sample or not exists (select 1 from public.mock_users mu where mu.user_id = r.user_id))
    ),
    interested_count = (
      select count(*) from public.event_rsvps r
      where r.event_id = target and r.status = 'interested'
        and (sample or not exists (select 1 from public.mock_users mu where mu.user_id = r.user_id))
    )
  where id = target;
  return null;
end;
$$;

update public.circles c set member_count = (
  select count(*) from public.circle_members cm where cm.circle_id = c.id
)
where c.id in (select circle_id from public.sample_circles);

update public.circle_events e set
  going_count = (select count(*) from public.event_rsvps r where r.event_id = e.id and r.status = 'going'),
  interested_count = (select count(*) from public.event_rsvps r where r.event_id = e.id and r.status = 'interested')
where e.circle_id in (select circle_id from public.sample_circles);

-- Year-round names for the seasonal sample events.
update public.circle_events e set title = v.title, description = v.description, location = coalesce(v.location, e.location)
from (values
  ('Republic Day Celebration', 'Turkish Night: Music & Dinner', 'Live music, home cooking and folk dance. Bring a friend.', null),
  ('Republic Day Picnic (Triangle)', 'Community Picnic (Triangle)', 'A potluck picnic for families across the Triangle.', null),
  ('Kids'' Halloween Parade', 'Kids'' Craft Afternoon', 'Crafts, games and snacks for the little ones.', 'Apex Community Center, NC'),
  ('Pumpkin Patch Outing', 'Farm Day Out', 'Hayrides, farm animals and a picnic for the whole family.', null),
  ('Winter Break Trip Swap', 'Family Trip Swap', 'Share itineraries and tips for your next family trip.', null),
  ('Holiday Lights Walk', 'Riverwalk Evening Stroll', 'An easy evening walk along the river, with dessert after.', 'Tampa Riverwalk, FL'),
  ('Winter Showcase', 'Members'' Showcase', 'Members perform and exhibit their work.', null),
  ('Year-End Business Mixer', 'Founders & Professionals Mixer', 'Drinks and introductions with founders and professionals.', null)
) as v(old_title, title, description, location)
where e.title = v.old_title
  and e.circle_id in (select circle_id from public.sample_circles);

-- Moves `t` forward by `n` days, keeping its wall-clock time in the sample circles'
-- time zone (all of them are in US Eastern), so a 6 PM event stays at 6 PM across DST.
create or replace function public.sample_shift(t timestamptz, n int)
returns timestamptz
language sql
immutable
set search_path = public
as $$
  select ((t at time zone 'America/New_York') + make_interval(days => n)) at time zone 'America/New_York';
$$;

revoke execute on function public.sample_shift(timestamptz, int) from public, anon, authenticated;

update public.circle_events
set starts_at = public.sample_shift(starts_at, 21), ends_at = public.sample_shift(ends_at, 21)
where circle_id in (select circle_id from public.sample_circles);

create or replace function public.refresh_sample_world()
returns void
language sql
security definer set search_path = public
as $$
  -- 12-week cycles: an event that started more than 8 weeks ago comes round again,
  -- so every event sits within the last 8 weeks or the next 4.
  with due as (
    select id, ceil(extract(epoch from (now() - interval '56 days' - starts_at)) / (84 * 86400))::int as cycles
    from public.circle_events
    where circle_id in (select circle_id from public.sample_circles)
      and starts_at < now() - interval '56 days'
  )
  update public.circle_events e
  set starts_at = public.sample_shift(e.starts_at, 84 * due.cycles),
      ends_at = public.sample_shift(e.ends_at, 84 * due.cycles)
  from due
  where e.id = due.id;

  -- The mock accounts' safety plans (the review account's "Your plans") stay one to
  -- eight days ahead, open.
  update public.safety_plans
  set meeting_at = public.sample_shift(meeting_at, 7 * ceil(extract(epoch from (now() + interval '1 day' - meeting_at)) / (7 * 86400))::int),
      status = 'active',
      checked_in_at = null
  where user_id in (select user_id from public.mock_users)
    and meeting_at < now() + interval '1 day';
$$;

revoke execute on function public.refresh_sample_world() from public, anon, authenticated;

select public.refresh_sample_world();

select cron.schedule(
  'refresh-sample-world',
  '23 4 * * *',
  $$select public.refresh_sample_world();$$
);

-- The review account's showcase chat (Nurlan H. and Aigerim Ö.): no date in the
-- opening line, so it never goes stale, and without the test messages typed into it
-- since.
update public.messages
set body = 'Hi! Are you coming to Turkish Night with the circle?'
where match_id = '91bd9749-201c-469f-8384-b6b8b00037db'
  and body like 'Hi! Are you coming to the Republic Day%';

delete from public.messages
where match_id = '91bd9749-201c-469f-8384-b6b8b00037db'
  and created_at > '2026-10-18';

-- A 22-year-old physician isn't believable.
update public.profiles set occupation = 'Medical student'
where id = 'f77390aa-018f-43ed-bfb6-1a86048876b1' and occupation = 'Physician';
