-- 1. profiles.deletion_requested_at goes. It came from Phase 5's "request deletion"
--    flow, replaced since by delete-account (which deletes the account straight away),
--    so nothing has set or cleared it in weeks -- but Discover and Likes you still left
--    out anyone with it set, which hid a test account from everyone. The two functions
--    that read it are redefined without it (otherwise unchanged from 0052 and 0033).
--
-- 2. A like pushes "Someone liked you" to the person liked -- not who: seeing who is
--    Plus's Likes you. After the like, pg_net calls send-like-push with only the pair's
--    ids, and the function reads the rest from the database (like message, match and
--    report pushes). It stays quiet when the like made a match (send-match-push tells
--    them), when push is off, and when the person already heard about a like in the
--    last 30 minutes. Only new likes: a like re-saved as a like doesn't push again.

create or replace function public.list_global_discover_candidates(max_count integer default 20)
returns table (user_id uuid)
language sql
security definer set search_path = public
as $$
  select p.id
  from public.profiles p
  where p.id != auth.uid()
    and p.discoverable
    and p.profile_visibility != 'hidden'
    and p.onboarding_completed_at is not null
    and public.is_visible_person(p.id)
    and not public.is_blocked(auth.uid(), p.id)
    and not exists (
      select 1 from public.swipes s
      where s.actor_id = auth.uid() and s.target_id = p.id
    )
    and not exists (
      select 1 from public.matches m
      where m.user_a = least(auth.uid(), p.id) and m.user_b = greatest(auth.uid(), p.id)
    )
    and public.passes_discover_filters(auth.uid(), p.id)
  order by random()
  limit least(greatest(max_count, 1), 50);
$$;

create or replace function public.pending_incoming_likes()
returns table (user_id uuid, circle_id uuid, liked_at timestamptz)
language sql
security definer set search_path = public
stable
as $$
  select distinct on (s.actor_id) s.actor_id, s.circle_id, s.updated_at
  from public.swipes s
  join public.profiles p on p.id = s.actor_id
  where auth.uid() is not null
    and s.target_id = auth.uid()
    and s.action = 'like'
    and p.onboarding_completed_at is not null
    and not public.is_blocked(auth.uid(), s.actor_id)
    and public.can_view_profile(s.actor_id)
    and not exists (
      select 1 from public.matches m
      where m.user_a = least(auth.uid(), s.actor_id) and m.user_b = greatest(auth.uid(), s.actor_id)
    )
    and not exists (
      select 1 from public.swipes mine
      where mine.actor_id = auth.uid() and mine.target_id = s.actor_id and mine.action = 'pass'
    )
  order by s.actor_id, s.updated_at desc;
$$;

alter table public.profiles drop column deletion_requested_at;

create or replace function public.notify_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.action != 'like' or (tg_op = 'UPDATE' and old.action = 'like') then
    return new;
  end if;

  perform net.http_post(
    url := 'https://mpcfakrdgqzcofscnwvu.supabase.co/functions/v1/send-like-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'type', 'INSERT', 'table', 'swipes',
      'record', jsonb_build_object('actor_id', new.actor_id, 'target_id', new.target_id)
    ),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

revoke execute on function public.notify_like() from public, anon, authenticated;

create trigger on_like_send_push
  after insert or update of action on public.swipes
  for each row execute function public.notify_like();
