-- Going / interested totals on each event, for the event cards. event_rsvps is
-- self-only readable, so clients can't count other people's RSVPs themselves;
-- denormalized counts maintained by trigger expose only the totals (same approach
-- as circles.member_count).
alter table public.circle_events
  add column going_count integer not null default 0,
  add column interested_count integer not null default 0;

-- Recounts rather than incrementing, so an update that changes status (e.g.
-- interested -> going) stays correct without per-transition bookkeeping.
-- security definer: circle_events has no UPDATE policy for authenticated users,
-- which would otherwise silently block this (the bug 0005 fixed for member_count).
create or replace function public.update_event_rsvp_counts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target uuid;
begin
  if tg_op = 'DELETE' then
    target := old.event_id;
  else
    target := new.event_id;
  end if;

  update public.circle_events set
    going_count = (select count(*) from public.event_rsvps where event_id = target and status = 'going'),
    interested_count = (select count(*) from public.event_rsvps where event_id = target and status = 'interested')
  where id = target;

  return null;
end;
$$;

create trigger event_rsvps_maintain_counts
  after insert or update or delete on public.event_rsvps
  for each row execute function public.update_event_rsvp_counts();

-- Backfill existing RSVPs.
update public.circle_events e set
  going_count = (select count(*) from public.event_rsvps r where r.event_id = e.id and r.status = 'going'),
  interested_count = (select count(*) from public.event_rsvps r where r.event_id = e.id and r.status = 'interested');
