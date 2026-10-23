-- The event page shows who is going and who is interested, in place of the circle's
-- members. Until now event_rsvps was self-only readable (0003), so other people's
-- RSVPs were visible only as 0020's totals. This lets a circle's members read the
-- going and interested RSVPs on that circle's events. "Not going" stays private to
-- the person who chose it, and RSVPs from anyone you have blocked, or who has blocked
-- you, stay hidden. 0003's own-RSVP policy still covers your own row in any status.
--
-- Postgres ORs select policies together, so this widens access only by these rows.
-- No recursion: circle_events and circle_members are read under their own policies,
-- neither of which refers back to event_rsvps.

create policy "circle-mates' going and interested rsvps are readable"
  on public.event_rsvps for select
  to authenticated
  using (
    status in ('going', 'interested')
    and exists (
      select 1
      from public.circle_events e
      join public.circle_members m on m.circle_id = e.circle_id
      where e.id = event_rsvps.event_id
        and m.user_id = auth.uid()
    )
    and not public.is_blocked(auth.uid(), event_rsvps.user_id)
  );

-- The event page lists attendees per event, newest RSVP last.
create index if not exists event_rsvps_event_status_idx
  on public.event_rsvps (event_id, status, updated_at);
