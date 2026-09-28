-- Manual light/dark toggle, same account-wide persistence pattern as app_locale
-- right above it in Settings -- no "system" option, since the toggle the user asked
-- for is a plain two-way switch, not a three-way system/light/dark picker.
alter table public.profiles
  add column theme_preference text not null default 'light'
    check (theme_preference in ('light', 'dark'));
