-- The oldest build each platform may still run. At startup the app compares its own
-- build number (iOS CFBundleVersion, Android versionCode) and, if it's lower, shows
-- "Update required" with a button to the store, so a database change that old apps
-- can't handle doesn't leave them broken. Raise a row when that's needed:
--   update public.app_min_builds set min_build = 7, updated_at = now() where platform = 'ios';
-- Readable without a login (the check runs before sign-in too); holds nothing personal.
-- Writable by no app user; change it from the dashboard or a migration.

create table public.app_min_builds (
  platform text primary key check (platform in ('ios', 'android')),
  min_build bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.app_min_builds enable row level security;

create policy "minimum builds are readable by anyone"
  on public.app_min_builds for select
  to anon, authenticated
  using (true);

-- 0: nothing is blocked until a row is raised.
insert into public.app_min_builds (platform, min_build) values ('ios', 0), ('android', 0);
