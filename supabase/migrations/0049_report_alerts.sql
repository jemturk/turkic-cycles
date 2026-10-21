-- Every new report alerts the app admins (public.app_admins) by push, so it gets
-- looked at -- the child safety page and the Terms promise reports are reviewed, child
-- safety first. Same mechanism as message pushes (0015): after the insert, pg_net calls
-- the notify-report Edge Function, which reads the report itself from the database
-- (the request only carries its id), so a forged call can't send made-up alerts.
--
-- notify-report is deployed with --no-verify-jwt: Postgres, not a signed-in user,
-- calls it, and no key goes into source control.

create or replace function public.notify_report_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://mpcfakrdgqzcofscnwvu.supabase.co/functions/v1/notify-report',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('type', 'INSERT', 'table', 'reports', 'record', jsonb_build_object('id', new.id)),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

revoke execute on function public.notify_report_insert() from public, anon, authenticated;

create trigger on_report_insert_alert_admins
  after insert on public.reports
  for each row execute function public.notify_report_insert();
