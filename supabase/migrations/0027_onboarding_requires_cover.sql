-- The cover photo -- the Discover/Connections card background -- is now the photo
-- at exactly position 0 (src/api/gallery.ts COVER_POSITION): removing it leaves
-- the cover slot empty instead of promoting the next photo. Finishing onboarding
-- therefore needs a photo in that slot, not just any photo (tightens 0026).

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
    if not exists (select 1 from public.profile_photos where user_id = new.id and position = 0) then
      raise exception 'A cover photo is required to finish setting up.'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

-- create or replace keeps 0026's revoke, but restate it so this file stands alone.
revoke execute on function public.require_onboarding_photos() from public, anon, authenticated;
