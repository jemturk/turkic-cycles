-- Deleting circles and events.
--
-- * delete_circle: the circle's owner (or an app admin) deletes it, with its events,
--   RSVPs, memberships and Discover activity (all of which already cascade). The
--   seeded sample circles (0065) can't be deleted this way: testers and App Review
--   depend on them.
-- * delete_event: the circle's owner or a moderator (or an app admin) deletes an
--   event, with its RSVPs.
--
-- Connections made in a circle outlive it. matches.circle_id used to cascade, which
-- (through messages.match_id) would have erased chats between members; it now becomes
-- null, like a connection made on the Discover tab. A pair can have only one
-- circle-less connection (matches_pair_circle_key), so where they already have one,
-- the deleted circle's chat moves into it first and the duplicate goes.

-- 0046's guard stops signed-in users changing a sent message. delete_circle runs as the
-- signed-in owner, so it sets halka.moving_messages for its own transaction while it
-- moves a chat; the guard lets that through and nothing else. (A setting app users
-- can't reach: set_config isn't exposed through the API.)
create or replace function public.message_update_is_receipt_only()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') <> 'authenticated' then
    return new;
  end if;
  if current_setting('halka.moving_messages', true) = 'on'
     and new.body is not distinct from old.body
     and new.sender_id is not distinct from old.sender_id
     and new.created_at is not distinct from old.created_at
     and new.id is not distinct from old.id then
    return new;
  end if;
  if new.body is distinct from old.body
     or new.sender_id is distinct from old.sender_id
     or new.match_id is distinct from old.match_id
     or new.reply_to_id is distinct from old.reply_to_id
     or new.created_at is distinct from old.created_at
     or new.id is distinct from old.id then
    raise exception 'A sent message can''t be changed; only its delivered and read times are set.'
      using errcode = '42501';
  end if;
  if (old.delivered_at is not null and new.delivered_at is distinct from old.delivered_at)
     or (old.read_at is not null and new.read_at is distinct from old.read_at) then
    raise exception 'A message''s delivered and read times are set once.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

alter table public.matches drop constraint matches_circle_id_fkey;
alter table public.matches
  add constraint matches_circle_id_fkey
  foreign key (circle_id) references public.circles (id) on delete set null;

create or replace function public.delete_circle(p_circle_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
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

  delete from public.circle_events where id = p_event_id;
end;
$$;

revoke execute on function public.delete_event(uuid) from public, anon;
grant execute on function public.delete_event(uuid) to authenticated;
