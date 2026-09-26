-- Phase 0: identity core. Every user gets a profiles row and a free-tier
-- subscriptions row the moment they sign up, via a trigger on auth.users.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  birthdate date,
  bio text,
  avatar_url text,
  city text,
  state text,
  country text,
  occupation text,
  languages text[] not null default '{}',
  interests text[] not null default '{}',
  hobbies text[] not null default '{}',
  travel_frequency text,
  travel_style text[] not null default '{}',
  us_residency boolean not null default false,
  us_citizenship boolean not null default false,
  european_citizenship boolean not null default false,
  onboarding_completed_at timestamptz,
  app_locale text not null default 'en',
  profile_visibility text not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'plus', 'business_circle')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled')),
  updated_at timestamptz not null default now()
);

-- Keep updated_at current on every row update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- New auth user -> profiles row + free-tier subscriptions row, atomically.
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

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-Level Security: self-write everywhere; read is self-only for now.
-- profiles' read policy widens in the Phase 3 migration once browse/discover needs
-- to see other users' profiles (scoped by circle membership + block checks).
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;

create policy "profiles are self-readable"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles are self-updatable"
  on public.profiles for update
  using (auth.uid() = id);

create policy "subscriptions are self-readable"
  on public.subscriptions for select
  using (auth.uid() = user_id);
