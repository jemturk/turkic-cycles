-- Onboarding now ends with a photos step: a profile picture plus at least one
-- gallery photo are required to finish setting up.
--
--   1. Enforced here too, not just in the app: finishing onboarding (setting
--      onboarding_completed_at for the first time) fails without both. Accounts
--      that already finished aren't affected, and removing photos later is allowed.
--   2. The 100 mock users (0021) get a profile picture and one gallery photo.

-- 1 -------------------------------------------------------------------------------

create or replace function public.require_onboarding_photos()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.onboarding_completed_at is not null and old.onboarding_completed_at is null then
    if coalesce(new.avatar_url, '') = '' then
      raise exception 'A profile picture is required to finish setting up.'
        using errcode = 'check_violation';
    end if;
    if not exists (select 1 from public.profile_photos where user_id = new.id) then
      raise exception 'At least one additional photo is required to finish setting up.'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_require_onboarding_photos
  before update of onboarding_completed_at on public.profiles
  for each row execute function public.require_onboarding_photos();

revoke execute on function public.require_onboarding_photos() from public, anon, authenticated;

-- 2 -------------------------------------------------------------------------------
-- External image URLs rather than Storage uploads (a migration can't upload files).
-- src/api/gallery.ts passes absolute URLs in storage_path straight through.
--   * Profile picture: DiceBear "notionists" illustrations -- deliberately not
--     photos of real people, since these are fake profiles.
--   * Gallery photo: a Lorem Picsum landscape-style photo.
-- Both are seeded by the user id, so each mock user always gets the same images.

update public.profiles p
set avatar_url = 'https://api.dicebear.com/9.x/notionists/png?size=256&backgroundColor=fdede5,e4f3f1,f3dfa8&seed=' || p.id
from auth.users u
where u.id = p.id
  and u.email like '%@turanci-mock.invalid'
  and coalesce(p.avatar_url, '') = '';

insert into public.profile_photos (user_id, storage_path, position)
select u.id, 'https://picsum.photos/seed/' || u.id || '/600/800', 0
from auth.users u
where u.email like '%@turanci-mock.invalid'
  and not exists (select 1 from public.profile_photos pp where pp.user_id = u.id);
