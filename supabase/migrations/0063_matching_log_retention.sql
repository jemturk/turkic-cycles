-- Retention for the matching logs (0062): kept 24 months, then deleted, so the data
-- used to refit the weights doesn't outlive its purpose (GDPR storage limitation; the
-- period is the one in the privacy policy). Everything else still goes with the
-- account. Runs daily at 03:17 UTC.

create or replace function public.purge_old_matching_logs()
returns void
language sql
security definer set search_path = public
as $$
  delete from public.suggestion_log where created_at < now() - interval '24 months';
  delete from public.interaction_log where created_at < now() - interval '24 months';
  delete from public.connection_log where created_at < now() - interval '24 months';
  delete from public.connection_feedback where updated_at < now() - interval '24 months';
$$;

revoke execute on function public.purge_old_matching_logs() from public, anon, authenticated;

select cron.schedule(
  'purge-old-matching-logs',
  '17 3 * * *',
  $$select public.purge_old_matching_logs();$$
);
