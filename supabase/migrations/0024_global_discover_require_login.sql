-- Fix for 0023: can_view_profile() returned true for any discoverable profile even
-- when there was no signed-in caller (auth.uid() null), so the anon key -- which
-- ships inside the app -- could read every discoverable profile, photo, connection
-- type and verification status without logging in. The circle-mates rule it
-- replaced never allowed that (it required the caller in circle_members).
--
-- Two layers: the function itself now requires a signed-in caller, and the
-- policies / RPCs that use it apply to the authenticated role only, so anonymous
-- requests never reach them at all.

create or replace function public.can_view_profile(target uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select auth.uid() is not null and (
    target = auth.uid() or exists (
      select 1 from public.profiles p
      where p.id = target
        and p.profile_visibility != 'hidden'
        and (
          p.discoverable
          or exists (
            select 1 from public.circle_members cm1
            join public.circle_members cm2 on cm1.circle_id = cm2.circle_id
            where cm1.user_id = auth.uid() and cm2.user_id = target
          )
          or exists (
            select 1 from public.matches m
            where m.user_a = least(auth.uid(), target) and m.user_b = greatest(auth.uid(), target)
          )
        )
    )
  );
$$;

drop policy "visible profiles are readable" on public.profiles;
create policy "visible profiles are readable"
  on public.profiles for select
  to authenticated
  using (public.can_view_profile(id));

drop policy "visible users' connection types are readable" on public.user_connection_types;
create policy "visible users' connection types are readable"
  on public.user_connection_types for select
  to authenticated
  using (public.can_view_profile(user_id));

drop policy "visible users' verification status is readable" on public.verification_status;
create policy "visible users' verification status is readable"
  on public.verification_status for select
  to authenticated
  using (public.can_view_profile(user_id));

drop policy "visible users' profile photos are readable" on public.profile_photos;
create policy "visible users' profile photos are readable"
  on public.profile_photos for select
  to authenticated
  using (public.can_view_profile(user_id));

-- Functions are executable by PUBLIC by default (and Supabase grants anon too), so
-- 0023's "grant ... to authenticated" didn't actually restrict anything.
revoke execute on function public.can_view_profile(uuid) from public, anon;
revoke execute on function public.list_global_discover_candidates(int) from public, anon;
revoke execute on function public.get_origin_countries_with_consent(uuid[]) from public, anon;
