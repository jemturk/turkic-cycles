-- Members whose photos keep getting rejected by the photo check (moderate-photo,
-- migration 0044) -- usually someone testing the filter. For review in the SQL
-- editor:
--   select * from photo_moderation_offenders;
-- moderate-photo itself also stops checking for a member after too many rejections
-- or attempts (see its limits); this is the longer-term view.

create view public.photo_moderation_offenders
with (security_invoker = true) as
select
  m.user_id,
  p.display_name,
  count(*) filter (where m.verdict = 'rejected') as rejected,
  count(*) filter (where m.verdict = 'review') as flagged,
  count(*) as checked,
  max(m.created_at) filter (where m.verdict = 'rejected') as last_rejected_at
from public.photo_moderation m
left join public.profiles p on p.id = m.user_id
group by m.user_id, p.display_name
having count(*) filter (where m.verdict = 'rejected') >= 2
order by rejected desc, last_rejected_at desc;

-- Server-only, like photo_moderation itself (security_invoker: reading it needs
-- access to the table, which the app doesn't have anyway).
revoke all on public.photo_moderation_offenders from anon, authenticated;

-- moderate-photo counts a member's recent checks on every upload.
create index photo_moderation_user_recent_idx on public.photo_moderation (user_id, created_at desc);
