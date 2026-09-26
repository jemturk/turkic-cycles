-- Phase 4: Chat. Adds a surrogate id to matches (its composite PK doesn't suit a simple
-- messages.match_id FK), blocked_users + is_blocked() pulled forward from Phase 5 so
-- messages' RLS respects blocking from day one, and messages itself with realtime.

alter table public.matches add column id uuid not null default gen_random_uuid();
alter table public.matches add constraint matches_id_key unique (id);

create table public.blocked_users (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

alter table public.blocked_users enable row level security;

create policy "own blocks are readable"
  on public.blocked_users for select
  using (auth.uid() = blocker_id);

create policy "block as self"
  on public.blocked_users for insert
  with check (auth.uid() = blocker_id);

create policy "unblock as self"
  on public.blocked_users for delete
  using (auth.uid() = blocker_id);

-- Shared helper, reused by messages' RLS now and swipes/matches' RLS whenever Phase 5
-- adds the actual block-a-user UI (no need to touch this function again then).
create or replace function public.is_blocked(a uuid, b uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.blocked_users
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

grant execute on function public.is_blocked(uuid, uuid) to authenticated;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

-- select/insert only for the two match participants, and only if neither has blocked
-- the other -- the master plan's priority-2 policy, correct from the start.
create policy "match participants can read messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (auth.uid() = m.user_a or auth.uid() = m.user_b)
        and not public.is_blocked(m.user_a, m.user_b)
    )
  );

create policy "match participants can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (auth.uid() = m.user_a or auth.uid() = m.user_b)
        and not public.is_blocked(m.user_a, m.user_b)
    )
  );

-- Only for marking read_at on the other participant's messages when a thread is
-- opened; not column-restricted (no trigger enforcing body is untouched), consistent
-- with this project's existing level of rigor elsewhere.
create policy "match participants can mark messages read"
  on public.messages for update
  using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id and (auth.uid() = m.user_a or auth.uid() = m.user_b)
    )
  );

alter publication supabase_realtime add table public.messages;
