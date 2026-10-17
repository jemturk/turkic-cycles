-- The app's web address moved from turanci.expo.app to turek.expo.app, and "turanci"
-- is being retired as a name. Migrations 0021 and 0026-0030 are history and stay as
-- they were; this updates the data they left behind:
--   * the mock profiles' photos (avatars from 0028, cover and activity photos from
--     0029/0030), which are served from the website's /mock-faces/, /mock-covers/
--     and /mock-activities/ folders, now at the new address;
--   * the mock users' fake email domain (0021), @turanci-mock.invalid ->
--     @turek-mock.invalid. They have no sign-in identities, so auth.users is the only
--     place it lives. Clean-up queries for mock users should now match the new domain.

update public.profiles
set avatar_url = replace(avatar_url, 'https://turanci.expo.app/', 'https://turek.expo.app/')
where avatar_url like 'https://turanci.expo.app/%';

update public.profile_photos
set storage_path = replace(storage_path, 'https://turanci.expo.app/', 'https://turek.expo.app/')
where storage_path like 'https://turanci.expo.app/%';

update auth.users
set email = replace(email, '@turanci-mock.invalid', '@turek-mock.invalid')
where email like '%@turanci-mock.invalid';
