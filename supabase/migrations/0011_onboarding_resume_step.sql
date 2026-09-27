-- Lets a user who abandons the onboarding wizard (e.g. via the step-1 back button,
-- which signs them out since there's nowhere else authenticated-but-incomplete to
-- land) resume at the step after the last one they actually completed, instead of
-- restarting at step-1 on their next login.
alter table public.profiles
  add column onboarding_step smallint not null default 1
    check (onboarding_step between 1 and 4);
