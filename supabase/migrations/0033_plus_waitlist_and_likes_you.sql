-- Turkic Circles Plus, first slice:
--
--   1. plus_waitlist -- people who want Plus before it's on sale (or on platforms
--      where it can't be bought, e.g. web).
--   2. subscriptions gets the store product id. The row is still written only by
--      the server (the RevenueCat webhook / sync-subscription edge functions, as
--      service_role); there is no client insert/update policy, so nobody can grant
--      themselves Plus.
--   3. has_plus() -- the one server-side "is this user paying" rule.
--   4. "Likes you": who liked the caller and isn't matched yet. swipes RLS still
--      only ever shows your OUTGOING swipes (0006), so this goes through security-
--      definer functions: the count is free for everyone, the names are Plus-only.

-- 1 -------------------------------------------------------------------------------

create table public.plus_waitlist (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.plus_waitlist enable row level security;

create policy "own waitlist entry is readable"
  on public.plus_waitlist for select
  to authenticated
  using (auth.uid() = user_id);

create policy "join the waitlist as self"
  on public.plus_waitlist for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "leave the waitlist as self"
  on public.plus_waitlist for delete
  to authenticated
  using (auth.uid() = user_id);

-- 2 -------------------------------------------------------------------------------

alter table public.subscriptions add column product_id text;

-- 0001's policy predates the to-authenticated rule.
drop policy "subscriptions are self-readable" on public.subscriptions;
create policy "subscriptions are self-readable"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

-- 3 -------------------------------------------------------------------------------
-- business_circle includes everything in Plus. current_period_end is a backstop
-- for a missed EXPIRATION webhook: a lapsed row stops counting on its own.

create or replace function public.has_plus(uid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid
      and s.tier in ('plus', 'business_circle')
      and s.status != 'canceled'
      and (s.current_period_end is null or s.current_period_end > now())
  );
$$;

-- Only called from inside the security-definer functions below.
revoke execute on function public.has_plus(uuid) from public, anon, authenticated;

-- 4 -------------------------------------------------------------------------------
-- A like counts while it's still waiting on you: not matched yet, you haven't
-- passed on them, neither side blocked, and you could see their profile anyway.
-- Liked you in several decks = one entry, the newest like (its circle_id is the
-- deck to answer in, so a like back lands in the scope that makes the match).

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
    and p.deletion_requested_at is null
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

revoke execute on function public.pending_incoming_likes() from public, anon, authenticated;

-- Free: just the number, for the "N people like you" teaser.
create or replace function public.count_incoming_likes()
returns int
language sql
security definer set search_path = public
stable
as $$
  select count(*)::int from public.pending_incoming_likes();
$$;

revoke execute on function public.count_incoming_likes() from public, anon;
grant execute on function public.count_incoming_likes() to authenticated;

-- Plus: who they are. Refuses rather than returning an empty list, so the app
-- can't mistake "not subscribed" for "nobody likes you".
create or replace function public.list_incoming_likes()
returns table (user_id uuid, circle_id uuid, liked_at timestamptz)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if auth.uid() is null or not public.has_plus(auth.uid()) then
    raise exception 'Turkic Circles Plus is required to see who liked you.'
      using errcode = 'insufficient_privilege';
  end if;

  return query
    select l.user_id, l.circle_id, l.liked_at
    from public.pending_incoming_likes() l
    order by l.liked_at desc;
end;
$$;

revoke execute on function public.list_incoming_likes() from public, anon;
grant execute on function public.list_incoming_likes() to authenticated;
