-- Phase 5: overdue safety-plan check-in detection, scheduled inside Postgres via
-- pg_cron rather than standing up a new service. Stub: flips status to 'overdue' only
-- -- a real version would also call an Edge Function here (via pg_net) to actually text
-- trusted_contacts through Twilio. That HTTP hop + secret management is the deferred
-- "final sub-slice," same as Stripe Identity for verification.

create extension if not exists pg_cron with schema extensions;

create or replace function public.process_overdue_safety_checkins()
returns void
language sql
security definer set search_path = public
as $$
  update public.safety_plans
  set status = 'overdue'
  where status = 'active'
    and checked_in_at is null
    and now() > meeting_at + (auto_checkin_minutes || ' minutes')::interval;
$$;

select cron.schedule(
  'process-overdue-safety-checkins',
  '*/5 * * * *',
  $$select public.process_overdue_safety_checkins();$$
);
