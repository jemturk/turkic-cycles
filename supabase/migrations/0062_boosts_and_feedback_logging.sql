-- Matching model v1, stages 5 and 6.
--
-- 5. "What matters most to you?": matching_preferences.boosts, per connection type,
--    { "<type>": { "<criterion>": "very" | "less" } } -- up to 3 "very" and 2 "less".
--    Self-only like the rest of the table; rank-discover reads it and ignores anything
--    beyond the limits (supabase/functions/_shared/matching.ts sanitizeBoosts).
--
-- 6. Feedback logging, so the weights can later be refit from real outcomes:
--    * suggestion_log: what the model scored each time rank-discover suggested someone
--      (both directions, every criterion, the viewer's weights, the model version),
--      once per pair per day. Snapshot at the time, since profiles change.
--    * interaction_log: every like / pass / save / removal as it happens (swipes keeps
--      only the latest answer per pair and scope).
--    * connection_log: every connection made (matches rows are deleted on removal).
--    * connection_feedback: a member's answer to "Did you meet or talk?" and how it was
--      (1-5), at most one per connection per member.
--    The logs are server-only; feedback is the member's own. All of it goes with the
--    account (on delete cascade).

alter table public.matching_preferences add column boosts jsonb not null default '{}'::jsonb;

create table public.suggestion_log (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid not null references auth.users (id) on delete cascade,
  other_id uuid not null references auth.users (id) on delete cascade,
  connection_type text not null,
  model_version text not null,
  match numeric,
  viewer_score numeric,
  other_score numeric,
  criterion_scores jsonb not null default '{}'::jsonb,
  viewer_weights jsonb not null default '{}'::jsonb,
  shown_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (viewer_id, other_id, shown_on)
);

create table public.interaction_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users (id) on delete cascade,
  target_id uuid not null references auth.users (id) on delete cascade,
  circle_id uuid,
  action text not null,
  created_at timestamptz not null default now()
);

create table public.connection_log (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  circle_id uuid,
  connection_type text,
  created_at timestamptz not null default now()
);

create table public.connection_feedback (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null,
  rater_id uuid not null references auth.users (id) on delete cascade,
  other_id uuid not null references auth.users (id) on delete cascade,
  met boolean not null,
  met_format text check (met_format in ('in_person', 'virtual')),
  rating int check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, rater_id)
);

create index suggestion_log_viewer_idx on public.suggestion_log (viewer_id, created_at desc);
create index interaction_log_actor_idx on public.interaction_log (actor_id, created_at desc);

alter table public.suggestion_log enable row level security;
alter table public.interaction_log enable row level security;
alter table public.connection_log enable row level security;
alter table public.connection_feedback enable row level security;
revoke all on public.suggestion_log, public.interaction_log, public.connection_log from anon, authenticated;
revoke all on public.connection_feedback from anon;

-- Feedback: your own, about a connection you're in (while it exists).
create policy "own connection feedback is readable"
  on public.connection_feedback for select to authenticated
  using (auth.uid() = rater_id);

create policy "feedback on your own connections"
  on public.connection_feedback for insert to authenticated
  with check (
    auth.uid() = rater_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and ((m.user_a = auth.uid() and m.user_b = other_id) or (m.user_b = auth.uid() and m.user_a = other_id))
    )
  );

create policy "own connection feedback is editable"
  on public.connection_feedback for update to authenticated
  using (auth.uid() = rater_id)
  with check (auth.uid() = rater_id);

create trigger connection_feedback_set_updated_at
  before update on public.connection_feedback
  for each row execute function public.set_updated_at();

create or replace function public.log_interaction()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.action is not distinct from old.action then
    return new;
  end if;
  insert into public.interaction_log (actor_id, target_id, circle_id, action)
  values (new.actor_id, new.target_id, new.circle_id, new.action);
  return new;
end;
$$;

revoke execute on function public.log_interaction() from public, anon, authenticated;

create trigger swipes_log_interaction
  after insert or update of action on public.swipes
  for each row execute function public.log_interaction();

create or replace function public.log_connection()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.connection_log (match_id, user_a, user_b, circle_id, connection_type)
  values (new.id, new.user_a, new.user_b, new.circle_id, new.connection_type);
  return new;
end;
$$;

revoke execute on function public.log_connection() from public, anon, authenticated;

create trigger matches_log_connection
  after insert on public.matches
  for each row execute function public.log_connection();
