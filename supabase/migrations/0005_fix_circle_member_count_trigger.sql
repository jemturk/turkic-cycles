-- Bug fix: update_circle_member_count() ran as the calling (authenticated) role, and
-- circles has no UPDATE policy for that role (only SELECT), so its internal
-- `update circles set member_count = ...` was silently blocked by RLS — member_count
-- never actually changed on join/leave. security definer (same pattern already used by
-- handle_new_user() in 0001_init.sql) lets this bookkeeping update bypass RLS correctly.
create or replace function public.update_circle_member_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.circles set member_count = member_count + 1 where id = new.circle_id;
  elsif tg_op = 'DELETE' then
    update public.circles set member_count = member_count - 1 where id = old.circle_id;
  end if;
  return null;
end;
$$;

-- Backfill: correct the count for circles affected by the bug before this fix landed.
update public.circles c
set member_count = (select count(*) from public.circle_members cm where cm.circle_id = c.id);
