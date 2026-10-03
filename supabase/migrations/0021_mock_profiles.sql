-- 100 mock users with completed profiles: 50 around Tampa, 50 around the Triangle
-- (Apex/Raleigh/Durham). 40 of them (20 per region) join 1-3 circles in their own
-- region, so circles have members to browse and Discover has people to show.
--
-- They can't sign in (empty password), and are all identifiable by email for
-- cleanup -- deleting them cascades to their profile, memberships, etc.:
--   delete from auth.users where email like '%@turanci-mock.invalid';
-- (.invalid is a reserved TLD, so these addresses can never receive mail.)

select setseed(0.21);

create temporary table mock_people as
select
  n,
  gen_random_uuid() as id,
  (array['Ahmet','Mehmet','Ayşe','Fatma','Elif','Zeynep','Emre','Burak','Can','Deniz',
         'Ece','Selin','Mert','Kerem','Aylin','Leyla','Murat','Serkan','Gizem','Ozan',
         'Aslan','Dilnoza','Aziz','Timur','Aigerim','Nurlan','Rustam','Gulnara','Farid','Nigar',
         'Arman','Saule','Bekzod','Madina','Eldar','Kamila','Yusuf','Hande','Tolga','Melis'])[1 + floor(random() * 40)::int]
    || ' ' ||
  (array['Y.','K.','D.','Ş.','Ç.','A.','Ö.','B.','T.','M.','R.','N.','S.','G.','H.'])[1 + floor(random() * 15)::int]
    as display_name,
  case when n <= 50
    then (array['Tampa','Tampa','Tampa','St. Petersburg','Clearwater','Brandon','Wesley Chapel'])[1 + floor(random() * 7)::int]
    else (array['Apex','Apex','Cary','Raleigh','Raleigh','Durham','Morrisville'])[1 + floor(random() * 7)::int]
  end as city,
  case when n <= 50 then 'FL' else 'NC' end as state,
  (current_date - (365 * 22 + floor(random() * 365 * 33))::int) as birthdate,
  (array['Software engineer','Nurse','Teacher','Architect','Accountant','Graduate student',
         'Product manager','Physician','Chef','Real estate agent','Data analyst','Pharmacist',
         'Small business owner','Civil engineer','Graphic designer','Researcher'])[1 + floor(random() * 16)::int]
    as occupation,
  (array['New to the area and looking to meet people from back home.',
         'Weekend hiker, weekday coffee addict.',
         'Always up for çay and a long conversation.',
         'Parent of two, trying every playground in town.',
         'Building a startup and happy to swap notes.',
         'Love cooking for friends — mantı is my specialty.',
         'Music, travel, and good food.',
         'Moved here for work, staying for the community.',
         'Looking for a tavla partner.',
         'Happy to help newcomers find their way around.'])[1 + floor(random() * 10)::int]
    as bio,
  random() as r1, random() as r2, random() as r3
from generate_series(1, 100) as n;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated',
  format('mock%s@turanci-mock.invalid', lpad(n::text, 3, '0')), '', now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  jsonb_build_object('display_name', display_name, 'mock', true),
  now(), now(), '', '', '', ''
from mock_people;

-- handle_new_user() has created bare profile rows; fill them in. Interests and
-- hobbies are shuffled per user via md5 -- an uncorrelated `order by random()`
-- subquery would be evaluated once and give everyone the same picks.
update public.profiles p set
  display_name = m.display_name,
  birthdate = m.birthdate,
  bio = m.bio,
  city = m.city,
  state = m.state,
  country = 'USA',
  occupation = m.occupation,
  languages = case
    when m.r1 < 0.25 then array['Turkish', 'English']
    when m.r1 < 0.45 then array['Turkish', 'English', 'German']
    when m.r1 < 0.6 then array['Azerbaijani', 'Turkish', 'English']
    when m.r1 < 0.72 then array['Uzbek', 'Russian', 'English']
    when m.r1 < 0.84 then array['Kazakh', 'Russian', 'English']
    when m.r1 < 0.92 then array['Kyrgyz', 'Russian', 'English']
    else array['Turkmen', 'Russian', 'English']
  end,
  interests = (select array_agg(i) from (
    select i from unnest(array['Family','Kids','Travel','Night life','Exercise','Self-development','Horoscope']) i
    order by md5(i || m.id::text) limit 2) s),
  hobbies = (select array_agg(h) from (
    select h from unnest(array['Swim','Tennis','Soccer','Ski','Paint','Sing','Play an instrument','Music']) h
    order by md5(h || m.id::text) limit 2) s),
  onboarding_step = 4,
  onboarding_completed_at = now()
from mock_people m
where p.id = m.id;

insert into public.user_connection_types (user_id, connection_type)
select id, 'friend' from mock_people where r2 < 0.8
union all
select id, 'business' from mock_people where r2 >= 0.6
union all
select id, 'romantic' from mock_people where r3 < 0.3
union all
select id, 'business_mentor' from mock_people where r3 >= 0.85
on conflict do nothing;

-- 20 Tampa residents (n 1-20) join Tampa circles; 20 Triangle residents (n 51-70)
-- join Triangle circles. Each gets one guaranteed circle, plus a ~30% chance of
-- each other circle in their region.
with joiners as (
  select id, n, state from mock_people where n between 1 and 20 or n between 51 and 70
),
regional as (
  select id, state, row_number() over (partition by state order by slug) - 1 as idx
  from public.circles where state in ('FL', 'NC') and latitude is not null
)
insert into public.circle_members (circle_id, user_id)
select r.id, j.id
from joiners j
join regional r on r.state = j.state
where r.idx = j.n % 5 or random() < 0.3
on conflict do nothing;

drop table mock_people;
