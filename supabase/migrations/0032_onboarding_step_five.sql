-- The photos step (step 5) was added in the app, but 0011's check still capped
-- onboarding_step at 4, so finishing step 4 (which records step 5 as the resume
-- point) was rejected and new users couldn't get past it.
alter table public.profiles
  drop constraint profiles_onboarding_step_check;

alter table public.profiles
  add constraint profiles_onboarding_step_check
    check (onboarding_step between 1 and 5);
