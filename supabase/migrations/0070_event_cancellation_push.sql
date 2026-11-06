-- Tell people when an upcoming event they replied to is cancelled.
--
-- delete_event and delete_circle (0069) queue a notice before deleting: the event's
-- title, start, circle, and who said Going or Interested (never Not going, never the
-- person deleting, only events still to come). pg_net then calls the
-- send-event-cancelled-push Edge Function with just the notice's id -- the request goes
-- out only if the delete commits. The function reads the notice (it can't read the
-- event any more: it's gone), deletes it straight away, and sends the pushes, so a
-- notice lives for seconds and the recipient list isn't kept.
--
-- event_cancellation_notices: RLS on, no policies -- no app user can read or write it;
-- only these security-definer functions and the Edge Function (service role) touch it.

create table public.event_cancellation_notices (
  id uuid primary key default gen_random_uuid(),
  -- 'event': the event was deleted; 'circle': its whole circle was.
  kind text not null check (kind in ('event', 'circle')),
  event_title text not null,
  starts_at timestamptz not null,
  -- No foreign key: the circle may be the thing being deleted.
  circle_id uuid,
  circle_name text not null,
  recipients uuid[] not null,
  created_at timestamptz not null default now()
);

alter table public.event_cancellation_notices enable row level security;

create or replace function public.queue_event_cancellation(p_event_id uuid, p_kind text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  notice_id uuid;
begin
  insert into public.event_cancellation_notices (kind, event_title, starts_at, circle_id, circle_name, recipients)
  select p_kind, e.title, e.starts_at, c.id, c.name, array_agg(r.user_id)
  from public.circle_events e
  join public.circles c on c.id = e.circle_id
  join public.event_rsvps r on r.event_id = e.id
  where e.id = p_event_id
    and e.starts_at > now()
    and r.status in ('going', 'interested')
    and r.user_id is distinct from auth.uid()
  group by e.title, e.starts_at, c.id, c.name
  returning id into notice_id;

  if notice_id is not null then
    perform net.http_post(
      url := 'https://mpcfakrdgqzcofscnwvu.supabase.co/functions/v1/send-event-cancelled-push',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('notice_id', notice_id),
      timeout_milliseconds := 5000
    );
  end if;
end;
$$;

revoke execute on function public.queue_event_cancellation(uuid, text) from public, anon, authenticated;

-- delete_circle and delete_event as in 0069, each queueing its notices first.
create or replace function public.delete_circle(p_circle_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  upcoming record;
begin
  if auth.uid() is null then
    raise exception 'Sign in to delete a circle.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.sample_circles where circle_id = p_circle_id) then
    raise exception 'Sample circles can''t be deleted.' using errcode = 'insufficient_privilege';
  end if;
  if not (
    public.is_app_admin()
    or exists (
      select 1 from public.circle_members
      where circle_id = p_circle_id and user_id = auth.uid() and role = 'owner'
    )
  ) then
    raise exception 'Only the circle''s owner can delete it.' using errcode = 'insufficient_privilege';
  end if;

  for upcoming in
    select id from public.circle_events where circle_id = p_circle_id and starts_at > now()
  loop
    perform public.queue_event_cancellation(upcoming.id, 'circle');
  end loop;

  -- Pairs who also have a circle-less connection: move this circle's chat into it.
  perform set_config('halka.moving_messages', 'on', true);
  update public.messages msg
  set match_id = other.id
  from public.matches m
  join public.matches other
    on other.user_a = m.user_a and other.user_b = m.user_b and other.circle_id is null
  where m.circle_id = p_circle_id and msg.match_id = m.id;
  perform set_config('halka.moving_messages', 'off', true);

  delete from public.matches m
  where m.circle_id = p_circle_id
    and exists (
      select 1 from public.matches other
      where other.user_a = m.user_a and other.user_b = m.user_b and other.circle_id is null
    );

  delete from public.circles where id = p_circle_id;
end;
$$;

revoke execute on function public.delete_circle(uuid) from public, anon;
grant execute on function public.delete_circle(uuid) to authenticated;

create or replace function public.delete_event(p_event_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_circle uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to delete an event.' using errcode = 'insufficient_privilege';
  end if;
  select circle_id into target_circle from public.circle_events where id = p_event_id;
  if target_circle is null then
    return; -- Already gone.
  end if;
  if not (
    public.is_app_admin()
    or exists (
      select 1 from public.circle_members
      where circle_id = target_circle and user_id = auth.uid() and role in ('owner', 'moderator')
    )
  ) then
    raise exception 'Only the circle''s owner or a moderator can delete its events.' using errcode = 'insufficient_privilege';
  end if;

  perform public.queue_event_cancellation(p_event_id, 'event');
  delete from public.circle_events where id = p_event_id;
end;
$$;

revoke execute on function public.delete_event(uuid) from public, anon;
grant execute on function public.delete_event(uuid) to authenticated;
