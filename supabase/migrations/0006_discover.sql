-- Phase 3: circle-scoped swiping, reciprocal-like matching, and the two RLS gaps it
-- surfaces (user_connection_types widened to circle-mates; profile_sensitive stays
-- self-only but gets the security-definer "matching use" function the master plan
-- called for instead of a direct grant).

create table public.swipes (
  actor_id uuid not null references auth.users (id) on delete cascade,
  target_id uuid not null references auth.users (id) on delete cascade,
  circle_id uuid not null references public.circles (id) on delete cascade,
  action text not null check (action in ('like', 'pass', 'save')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (actor_id, target_id, circle_id)
);

create table public.matches (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  circle_id uuid not null references public.circles (id) on delete cascade,
  -- Which connection type matched them isn't cleanly derivable (either user may have
  -- selected several overlapping types), so this stays null for now rather than
  -- inventing an intent-resolution algorithm nothing else in the app specifies yet.
  connection_type text,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  primary key (user_a, user_b, circle_id)
);

create trigger swipes_set_updated_at
  before update on public.swipes
  for each row execute function public.set_updated_at();

-- Reciprocal-like -> match, atomic in the DB (avoids a race between near-simultaneous
-- swipes). security definer: matches has no client insert policy at all — only this
-- function, running as owner, is allowed to create one.
create or replace function public.handle_reciprocal_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  reverse_exists boolean;
begin
  if new.action != 'like' then
    return new;
  end if;

  select exists (
    select 1 from public.swipes
    where actor_id = new.target_id and target_id = new.actor_id
      and circle_id = new.circle_id and action = 'like'
  ) into reverse_exists;

  if reverse_exists then
    insert into public.matches (user_a, user_b, circle_id)
    values (least(new.actor_id, new.target_id), greatest(new.actor_id, new.target_id), new.circle_id)
    on conflict (user_a, user_b, circle_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger swipes_handle_reciprocal_like
  after insert or update on public.swipes
  for each row execute function public.handle_reciprocal_like();

alter table public.swipes enable row level security;
alter table public.matches enable row level security;

-- swipes: insert/update as self. SELECT is deliberately restricted to your own
-- OUTGOING swipes (actor_id) only — never target_id — so a user can never see who
-- swiped on them before a match exists. This is the load-bearing privacy policy for
-- the whole reveal-on-match mechanic.
create policy "own swipes are readable"
  on public.swipes for select
  using (auth.uid() = actor_id);

create policy "swipe as self"
  on public.swipes for insert
  with check (auth.uid() = actor_id);

create policy "update own swipe as self"
  on public.swipes for update
  using (auth.uid() = actor_id);

-- matches: read-only for the two participants; no insert/update/delete policy for the
-- client at all — only handle_reciprocal_like() (security definer) can write.
create policy "own matches are readable"
  on public.matches for select
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Widen user_connection_types to circle-mates (same pattern as profiles in Phase 2) —
-- "Looking for" tags aren't a sensitive field per the master plan's priority list, so a
-- direct policy is appropriate here (adds to, doesn't replace, the existing self-only
-- policy from 0002_onboarding.sql; Postgres OR's multiple permissive policies together).
create policy "circle-mates' connection types are readable"
  on public.user_connection_types for select
  using (
    exists (
      select 1 from public.circle_members cm1
      join public.circle_members cm2 on cm1.circle_id = cm2.circle_id
      where cm1.user_id = auth.uid() and cm2.user_id = user_connection_types.user_id
    )
  );

-- profile_sensitive stays self-only (no new table policy). This is the security-definer
-- function the master plan specifically called for: returns origin_countries for a
-- batch of target users only where the caller shares a circle with them AND a live,
-- non-revoked consent_records grant exists for purpose='matching'.
create or replace function public.get_origin_countries_with_consent(target_ids uuid[])
returns table (user_id uuid, origin_countries text[])
language sql
security definer set search_path = public
as $$
  select ps.user_id, ps.origin_countries
  from public.profile_sensitive ps
  where ps.user_id = any(target_ids)
    and exists (
      select 1 from public.circle_members cm1
      join public.circle_members cm2 on cm1.circle_id = cm2.circle_id
      where cm1.user_id = auth.uid() and cm2.user_id = ps.user_id
    )
    and exists (
      select 1 from public.consent_records cr
      where cr.user_id = ps.user_id and cr.field_key = 'origin_countries'
        and cr.purpose = 'matching' and cr.granted = true and cr.revoked_at is null
    );
$$;

grant execute on function public.get_origin_countries_with_consent(uuid[]) to authenticated;
