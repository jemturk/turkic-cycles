-- Account-wide display text size (Settings > Text size), same simple
-- account-column pattern as theme_preference/app_locale right above it.
alter table public.profiles
  add column text_size text not null default 'default'
    check (text_size in ('small', 'default', 'large'));
