-- Phase 2: Circles — community groups users browse, join, and RSVP to events in.

create table public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  topic text not null check (topic in ('culture', 'business', 'newcomers', 'family', 'creative')),
  city text,
  state text,
  country text,
  member_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.circle_members (
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator', 'owner')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);

create table public.circle_events (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.event_rsvps (
  event_id uuid not null references public.circle_events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('going', 'interested', 'not_going')),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create trigger circles_set_updated_at
  before update on public.circles
  for each row execute function public.set_updated_at();

create trigger event_rsvps_set_updated_at
  before update on public.event_rsvps
  for each row execute function public.set_updated_at();

-- Denormalized member_count, maintained by trigger rather than counted on every read.
create or replace function public.update_circle_member_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.circles set member_count = member_count + 1 where id = new.circle_id;
  elsif tg_op = 'DELETE' then
    update public.circles set member_count = member_count - 1 where id = old.circle_id;
  end if;
  return null;
end;
$$;

create trigger circle_members_maintain_count
  after insert or delete on public.circle_members
  for each row execute function public.update_circle_member_count();

-- Row-Level Security
alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_events enable row level security;
alter table public.event_rsvps enable row level security;

-- circles: open read (browsing is the point); no client insert policy — Phase 2 ships
-- with seed data only, a self-serve "start a circle" flow is a later-phase concern.
create policy "circles are readable by authenticated users"
  on public.circles for select
  to authenticated
  using (true);

-- circle_members: open read (who's in a public community group isn't sensitive; this
-- also lets the circle-mates profiles policy below evaluate for any circle, not just
-- ones the viewer has joined). Join/leave as self only.
create policy "circle members are readable"
  on public.circle_members for select
  to authenticated
  using (true);

create policy "join a circle as self"
  on public.circle_members for insert
  with check (auth.uid() = user_id);

create policy "leave a circle as self"
  on public.circle_members for delete
  using (auth.uid() = user_id);

-- circle_events: open read. Creation gated to owner/moderator of that circle — unused
-- by any UI this phase (events are seeded), but correct to have in place now.
create policy "circle events are readable"
  on public.circle_events for select
  to authenticated
  using (true);

create policy "circle events are creatable by owners and moderators"
  on public.circle_events for insert
  with check (exists (
    select 1 from public.circle_members
    where circle_id = circle_events.circle_id and user_id = auth.uid() and role in ('owner', 'moderator')
  ));

-- event_rsvps: self-only read/write.
create policy "own rsvp is readable"
  on public.event_rsvps for select
  using (auth.uid() = user_id);

create policy "own rsvp is insertable"
  on public.event_rsvps for insert
  with check (auth.uid() = user_id);

create policy "own rsvp is updatable"
  on public.event_rsvps for update
  using (auth.uid() = user_id);

-- profiles: widen read access one phase earlier than originally planned (0001_init.sql
-- deferred this to "Phase 3 once browse/discover needs it" — Circles needs it now for
-- the members grid). Scoped to circle-mates, not all authenticated users: narrower,
-- matches the product's community-trust model, and since Phase 3's discover is itself
-- circle-scoped, this likely covers that need too without revisiting the policy again.
create policy "circle-mates' profiles are readable"
  on public.profiles for select
  using (
    exists (
      select 1 from public.circle_members cm1
      join public.circle_members cm2 on cm1.circle_id = cm2.circle_id
      where cm1.user_id = auth.uid() and cm2.user_id = profiles.id
    )
  );
