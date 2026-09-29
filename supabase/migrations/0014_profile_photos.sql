-- Profile photo gallery: up to 6 extra photos per user, alongside the single
-- profiles.avatar_url. Stored in the existing "avatars" bucket (0012) under
-- "{user_id}/gallery/{photo_id}.{ext}" -- that bucket's storage.objects policies
-- already key off storage.foldername(name)[1] = auth.uid(), so any filename under
-- a user's own folder is already covered without a new bucket or storage policy.
-- The 6-photo cap is enforced client-side only, same as the existing 3-country cap
-- on origin_countries -- no trigger, matching that precedent.
create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  position int not null,
  created_at timestamptz not null default now()
);

create index profile_photos_user_id_idx on public.profile_photos (user_id);

alter table public.profile_photos enable row level security;

create policy "own profile photos are readable"
  on public.profile_photos for select
  using (auth.uid() = user_id);

-- Mirrors "circle-mates' profiles are readable" (0008) exactly: a hidden profile's
-- photos stay hidden along with everything else about it.
create policy "circle-mates' profile photos are readable"
  on public.profile_photos for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = profile_photos.user_id and profiles.profile_visibility != 'hidden'
    )
    and exists (
      select 1 from public.circle_members cm1
      join public.circle_members cm2 on cm1.circle_id = cm2.circle_id
      where cm1.user_id = auth.uid() and cm2.user_id = profile_photos.user_id
    )
  );

create policy "add own profile photo"
  on public.profile_photos for insert
  with check (auth.uid() = user_id);

create policy "reorder own profile photos"
  on public.profile_photos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "remove own profile photo"
  on public.profile_photos for delete
  using (auth.uid() = user_id);
