-- Hides the mock profiles (0021's seeded users) from everyone except test accounts,
-- so real members only ever meet real people while testers keep a busy world to try
-- things in. Done in the database, not the app, so no screen can show a mock by
-- accident.
--
-- Two private lists, readable by no app user (RLS on, no policies) and only
-- consulted through security-definer functions -- a flag on profiles would let
-- members change it on their own row:
--   * mock_users: the seeded profiles, matched by their fake email domain
--     (@turanci-mock.invalid, renamed @turek-mock.invalid by 0041).
--   * test_accounts: who may see them. Starts with the app admins; add more with
--       insert into public.test_accounts (user_id)
--       select id from auth.users where email = '...';
--
-- Where mocks are hidden for everyone else:
--   * profiles, photos, verification badges, connection types: through
--     can_view_profile, which their read policies already use;
--   * Discover's global candidates and incoming likes;
--   * circle member lists (circle_members) and event attendees (event_rsvps);
--   * circles' member counts and events' going / interested counts, which now count
--     real members only -- for testers too, so testers see a few more faces than
--     the counts say.

create table public.mock_users (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.mock_users enable row level security;

create table public.test_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.test_accounts enable row level security;

insert into public.mock_users (user_id)
select id from auth.users
where email like '%@turanci-mock.invalid' or email like '%@turek-mock.invalid';

insert into public.test_accounts (user_id)
select user_id from public.app_admins
on conflict do nothing;

-- Whether the signed-in user may see mock profiles.
create or replace function public.sees_mocks()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.test_accounts where user_id = auth.uid());
$$;

-- Whether `target` should be visible to the signed-in user as far as mocks go:
-- everyone real is, a mock only to testers, and you always see yourself.
create or replace function public.is_visible_person(target uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select target = auth.uid()
    or not exists (select 1 from public.mock_users where user_id = target)
    or public.sees_mocks();
$$;

revoke execute on function public.sees_mocks() from public, anon;
revoke execute on function public.is_visible_person(uuid) from public, anon;
grant execute on function public.sees_mocks() to authenticated;
grant execute on function public.is_visible_person(uuid) to authenticated;

-- Profiles (and through it photos, badges, connection types and incoming likes).
create or replace function public.can_view_profile(target uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select auth.uid() is not null and (
    target = auth.uid() or (
      public.is_visible_person(target)
      and exists (
        select 1 from public.profiles p
        where p.id = target
          and p.profile_visibility != 'hidden'
          and (
            p.discoverable
            or exists (
              select 1 from public.circle_members cm1
              join public.circle_members cm2 on cm1.circle_id = cm2.circle_id
              where cm1.user_id = auth.uid() and cm2.user_id = target
            )
            or exists (
              select 1 from public.matches m
              where m.user_a = least(auth.uid(), target) and m.user_b = greatest(auth.uid(), target)
            )
          )
      )
    )
  );
$$;

-- Discover's people from everywhere.
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
    and p.deletion_requested_at is null
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
  order by random()
  limit least(greatest(max_count, 1), 50);
$$;

-- Circle member lists.
drop policy "circle members are readable" on public.circle_members;
create policy "circle members are readable"
  on public.circle_members for select
  to authenticated
  using (public.is_visible_person(user_id));

-- Event attendees (0040's rule, plus the mock check).
drop policy "circle-mates' going and interested rsvps are readable" on public.event_rsvps;
create policy "circle-mates' going and interested rsvps are readable"
  on public.event_rsvps for select
  to authenticated
  using (
    status in ('going', 'interested')
    and exists (
      select 1
      from public.circle_events e
      join public.circle_members m on m.circle_id = e.circle_id
      where e.id = event_rsvps.event_id
        and m.user_id = auth.uid()
    )
    and not public.is_blocked(auth.uid(), event_rsvps.user_id)
    and public.is_visible_person(event_rsvps.user_id)
  );

-- Member counts: recount real members rather than adding and subtracting, so a
-- mock joining or leaving never moves them.
create or replace function public.update_circle_member_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target uuid;
begin
  target := case when tg_op = 'DELETE' then old.circle_id else new.circle_id end;
  update public.circles set member_count = (
    select count(*) from public.circle_members cm
    where cm.circle_id = target
      and not exists (select 1 from public.mock_users mu where mu.user_id = cm.user_id)
  )
  where id = target;
  return null;
end;
$$;

-- Going / interested counts (0020), real members only.
create or replace function public.update_event_rsvp_counts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target uuid;
begin
  target := case when tg_op = 'DELETE' then old.event_id else new.event_id end;
  update public.circle_events set
    going_count = (
      select count(*) from public.event_rsvps r
      where r.event_id = target and r.status = 'going'
        and not exists (select 1 from public.mock_users mu where mu.user_id = r.user_id)
    ),
    interested_count = (
      select count(*) from public.event_rsvps r
      where r.event_id = target and r.status = 'interested'
        and not exists (select 1 from public.mock_users mu where mu.user_id = r.user_id)
    )
  where id = target;
  return null;
end;
$$;

-- Bring the stored counts in line now.
update public.circles c set member_count = (
  select count(*) from public.circle_members cm
  where cm.circle_id = c.id
    and not exists (select 1 from public.mock_users mu where mu.user_id = cm.user_id)
);

update public.circle_events e set
  going_count = (
    select count(*) from public.event_rsvps r
    where r.event_id = e.id and r.status = 'going'
      and not exists (select 1 from public.mock_users mu where mu.user_id = r.user_id)
  ),
  interested_count = (
    select count(*) from public.event_rsvps r
    where r.event_id = e.id and r.status = 'interested'
      and not exists (select 1 from public.mock_users mu where mu.user_id = r.user_id)
  );
