-- Profile photos are checked for nudity and graphic violence before anyone else can
-- see them (Google Cloud Vision SafeSearch, in the moderate-photo Edge Function).
--
-- Until now the app uploaded straight into the public avatars bucket, so a photo was
-- live the moment it finished uploading. Now:
--
--   1. the app uploads into photo-uploads, a private bucket only the uploader can use;
--   2. moderate-photo checks it and, if it passes, copies it into avatars (and, for
--      the profile picture, sets profiles.avatar_url) with the service role;
--   3. the app can no longer write into avatars at all, nor set avatar_url, nor point
--      a profile_photos row at anything but a file that's in avatars -- so there's no
--      way around the check, including linking an image hosted elsewhere.
--
-- Every verdict is logged in photo_moderation, for reviewing borderline photos.

-- 1. The private upload bucket. Same limits as avatars.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photo-uploads', 'photo-uploads', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Own folder only ("{user_id}/..."), like avatars. Select and update are needed for
-- the profile picture's upsert (same path every time).
create policy "Users can upload photos for checking"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'photo-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can replace their photos awaiting checking"
  on storage.objects for update to authenticated
  using (bucket_id = 'photo-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can see their photos awaiting checking"
  on storage.objects for select to authenticated
  using (bucket_id = 'photo-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can remove their photos awaiting checking"
  on storage.objects for delete to authenticated
  using (bucket_id = 'photo-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- 2. avatars: only moderate-photo (service role) writes now. Reading stays public;
-- deleting your own stays allowed (removing a photo, src/api/avatar.ts and gallery.ts).
drop policy "Users can upload their own avatar" on storage.objects;
drop policy "Users can update their own avatar" on storage.objects;

-- 3a. profiles.avatar_url: set by moderate-photo only. Members may still clear it
-- (removing their picture). Other writers -- migrations, the service role -- aren't
-- signed-in users, so auth.role() isn't 'authenticated' for them.
create or replace function public.avatar_url_set_by_server()
returns trigger
language plpgsql
as $$
begin
  if new.avatar_url is not null
     and new.avatar_url is distinct from (case when tg_op = 'UPDATE' then old.avatar_url end)
     and coalesce(auth.role(), '') = 'authenticated' then
    raise exception 'Profile pictures are set by the photo check (moderate-photo), not directly.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.avatar_url_set_by_server() from public, anon, authenticated;

create trigger profiles_avatar_url_set_by_server
  before insert or update of avatar_url on public.profiles
  for each row execute function public.avatar_url_set_by_server();

-- 3b. profile_photos: a new row must point at the member's own gallery file in
-- avatars, which only moderate-photo can have put there. Restrictive, so it applies
-- on top of the existing "add own" policy (0014). The sample members' rows (full image
-- URLs, migration 0026) were written by migrations and are unaffected.
create policy "profile photos must be checked files"
  on public.profile_photos as restrictive for insert to authenticated
  with check (
    storage_path like auth.uid()::text || '/gallery/%'
    and exists (select 1 from storage.objects o where o.bucket_id = 'avatars' and o.name = storage_path)
  );

-- Reordering ("reorder own", 0014) only changes position; the file a row points at
-- never changes after it's added. A trigger rather than a policy, so rows with
-- older-style paths (the review account's sample photos) can still be reordered.
create or replace function public.profile_photo_path_is_fixed()
returns trigger
language plpgsql
as $$
begin
  if new.storage_path is distinct from old.storage_path and coalesce(auth.role(), '') = 'authenticated' then
    raise exception 'A profile photo''s file can''t be changed; add a new photo instead.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.profile_photo_path_is_fixed() from public, anon, authenticated;

create trigger profile_photos_path_is_fixed
  before update of storage_path on public.profile_photos
  for each row execute function public.profile_photo_path_is_fixed();

-- 4. The log. Server-only: RLS on and no policies, so the app can't read or write it.
create table public.photo_moderation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  verdict text not null check (verdict in ('approved', 'review', 'rejected')),
  safe_search jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.photo_moderation enable row level security;
revoke all on public.photo_moderation from anon, authenticated;

create index photo_moderation_review_idx on public.photo_moderation (created_at desc) where verdict <> 'approved';
