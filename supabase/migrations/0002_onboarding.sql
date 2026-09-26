-- Phase 1: connection-type selection, branching questionnaire, and
-- sensitive profile fields with their own consent trail.

create table public.user_connection_types (
  user_id uuid not null references auth.users (id) on delete cascade,
  connection_type text not null check (
    connection_type in ('friend', 'romantic', 'business', 'business_mentor', 'academic_mentor', 'spiritual_mentor')
  ),
  created_at timestamptz not null default now(),
  primary key (user_id, connection_type)
);
-- No `role` column here, deliberately: business roles (array) and mentor seeking/offering
-- (scalar) are already fully captured per connection_type in questionnaire_responses.answers.
-- A second copy here would be a duplicate source of truth that can drift. This table is
-- purely "which connection types did this user pick." Selection changes are delete+insert.

create table public.questionnaire_responses (
  user_id uuid primary key references auth.users (id) on delete cascade,
  core jsonb not null default '{}'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  schema_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_sensitive (
  user_id uuid primary key references auth.users (id) on delete cascade,
  origin_countries text[] not null default '{}'
    check (array_length(origin_countries, 1) is null or array_length(origin_countries, 1) <= 3),
  religious_affiliation text,       -- column exists per the full schema design; no Phase 1 UI
  citizenship_status_detail text,   -- collects these yet, so they stay null for now.
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  field_key text not null,
  granted boolean not null,
  purpose text not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);

create trigger questionnaire_responses_set_updated_at
  before update on public.questionnaire_responses
  for each row execute function public.set_updated_at();

create trigger profile_sensitive_set_updated_at
  before update on public.profile_sensitive
  for each row execute function public.set_updated_at();

-- Row-Level Security: self-only everywhere in this migration.
alter table public.user_connection_types enable row level security;
alter table public.questionnaire_responses enable row level security;
alter table public.profile_sensitive enable row level security;
alter table public.consent_records enable row level security;

create policy "own connection types are readable"
  on public.user_connection_types for select
  using (auth.uid() = user_id);

create policy "own connection types are insertable"
  on public.user_connection_types for insert
  with check (auth.uid() = user_id);

create policy "own connection types are deletable"
  on public.user_connection_types for delete
  using (auth.uid() = user_id);

create policy "own questionnaire responses are readable"
  on public.questionnaire_responses for select
  using (auth.uid() = user_id);

create policy "own questionnaire responses are insertable"
  on public.questionnaire_responses for insert
  with check (auth.uid() = user_id);

create policy "own questionnaire responses are updatable"
  on public.questionnaire_responses for update
  using (auth.uid() = user_id);

-- profile_sensitive: self-only, forever. Matching use (Phase 3) goes through a
-- security-definer function that checks consent_records — never a direct grant to other users.
create policy "own sensitive profile is readable"
  on public.profile_sensitive for select
  using (auth.uid() = user_id);

create policy "own sensitive profile is insertable"
  on public.profile_sensitive for insert
  with check (auth.uid() = user_id);

create policy "own sensitive profile is updatable"
  on public.profile_sensitive for update
  using (auth.uid() = user_id);

-- consent_records: append-only audit log. Deliberately NO update/delete policy at all (not
-- even for self) so a granted consent can only ever be added-to, never edited/erased client-side.
create policy "own consent records are readable"
  on public.consent_records for select
  using (auth.uid() = user_id);

create policy "own consent records are insertable"
  on public.consent_records for insert
  with check (auth.uid() = user_id);
