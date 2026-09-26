-- Phase 5: verification (stubbed), reports, safety plans, matching preferences, and
-- retrofits promised by earlier phases (profile_visibility enforcement; is_blocked()
-- wired into swipes/matches now that this phase adds the actual block-a-user UI).

create table public.verification_status (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'unverified' check (status in ('unverified', 'pending', 'verified', 'failed')),
  stripe_identity_session_id text,
  updated_at timestamptz not null default now()
);

create trigger verification_status_set_updated_at
  before update on public.verification_status
  for each row execute function public.set_updated_at();

alter table public.verification_status enable row level security;

create policy "own verification status is readable"
  on public.verification_status for select
  using (auth.uid() = user_id);

-- Client can only ever move itself to 'pending' (submitting the stub flow). 'verified'/
-- 'failed' are reserved for a future service_role webhook (real Stripe Identity
-- integration) -- never settable by the client, per the master plan.
create policy "self can submit for pending verification"
  on public.verification_status for insert
  with check (auth.uid() = user_id and status in ('unverified', 'pending'));

create policy "self can resubmit for pending verification"
  on public.verification_status for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and status in ('unverified', 'pending'));

-- Every new user gets a default row, same pattern as profiles/subscriptions.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));

  insert into public.subscriptions (user_id)
  values (new.id);

  insert into public.verification_status (user_id)
  values (new.id);

  return new;
end;
$$;

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reported_user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy "own reports are readable"
  on public.reports for select
  using (auth.uid() = reporter_id);

create policy "report as self"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create table public.safety_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meeting_with text not null,
  location text,
  meeting_at timestamptz not null,
  trusted_contacts jsonb not null default '[]'::jsonb,
  auto_checkin_minutes int not null default 120,
  checked_in_at timestamptz,
  status text not null default 'active' check (status in ('active', 'checked_in', 'overdue', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.safety_plans enable row level security;

create policy "own safety plans are readable"
  on public.safety_plans for select
  using (auth.uid() = user_id);

create policy "create safety plan as self"
  on public.safety_plans for insert
  with check (auth.uid() = user_id);

create policy "update own safety plan"
  on public.safety_plans for update
  using (auth.uid() = user_id);

-- Distinct "search settings" concern, deliberately its own table rather than more
-- profiles columns -- self-only, never read by anyone else.
create table public.matching_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  age_min int,
  age_max int,
  max_distance_miles int,
  languages text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create trigger matching_preferences_set_updated_at
  before update on public.matching_preferences
  for each row execute function public.set_updated_at();

alter table public.matching_preferences enable row level security;

create policy "own matching preferences are readable"
  on public.matching_preferences for select
  using (auth.uid() = user_id);

create policy "own matching preferences are insertable"
  on public.matching_preferences for insert
  with check (auth.uid() = user_id);

create policy "own matching preferences are updatable"
  on public.matching_preferences for update
  using (auth.uid() = user_id);

-- Notification preference storage only -- no push/email delivery infra exists yet.
alter table public.profiles add column push_notifications_enabled boolean not null default true;
alter table public.profiles add column email_notifications_enabled boolean not null default false;
alter table public.profiles add column deletion_requested_at timestamptz;

-- Retrofit: profile_visibility (existing column since 0001) enforced for the first
-- time. Self-read is a separate, untouched policy, so a hidden user always sees their
-- own profile regardless.
drop policy "circle-mates' profiles are readable" on public.profiles;

create policy "circle-mates' profiles are readable"
  on public.profiles for select
  using (
    profile_visibility != 'hidden'
    and exists (
      select 1 from public.circle_members cm1
      join public.circle_members cm2 on cm1.circle_id = cm2.circle_id
      where cm1.user_id = auth.uid() and cm2.user_id = profiles.id
    )
  );

-- Retrofit: is_blocked() (added in 0007 for exactly this moment) wired into swipes and
-- matches now that this phase adds the actual block-a-user action.
drop policy "swipe as self" on public.swipes;

create policy "swipe as self"
  on public.swipes for insert
  with check (auth.uid() = actor_id and not public.is_blocked(actor_id, target_id));

drop policy "own matches are readable" on public.matches;

create policy "own matches are readable"
  on public.matches for select
  using ((auth.uid() = user_a or auth.uid() = user_b) and not public.is_blocked(user_a, user_b));
