-- 1. Adults only, enforced by the database: no profile can hold a birthdate that
--    makes its owner under 18, whatever client or API call sets it. (Onboarding
--    already validates this in the app -- schemas/questionnaire/core.ts -- but
--    that alone can be bypassed.)
-- 2. Mock users (0021) get realistic profile pictures: AI-generated faces of people
--    who don't exist, hand-checked so every one is unmistakably an adult, hosted
--    with the web build (public/mock-faces/). These replace 0026's illustrations.
--    For internal testing only: delete the mock users before anyone else uses the
--    app (see 0021 for the one-line cleanup).

-- 1 -------------------------------------------------------------------------------

create or replace function public.require_adult_birthdate()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.birthdate is not null and new.birthdate > (current_date - interval '18 years') then
    raise exception 'You must be 18 or older to use Turkic Circles.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profiles_require_adult_birthdate
  before insert or update of birthdate on public.profiles
  for each row execute function public.require_adult_birthdate();

revoke execute on function public.require_adult_birthdate() from public, anon, authenticated;

-- 2 -------------------------------------------------------------------------------
-- Gender from the first name (0021's name list); within each gender, the youngest
-- mock users get the youngest-looking faces (files are numbered roughly by apparent
-- age), spread evenly so any repeats are as far apart as possible.
-- Pools: m-001..m-044, f-001..f-030.

with mock as (
  select p.id, p.birthdate,
    case when split_part(p.display_name, ' ', 1) in (
      'Ahmet', 'Mehmet', 'Emre', 'Burak', 'Can', 'Deniz', 'Mert', 'Kerem', 'Murat', 'Serkan', 'Ozan',
      'Aslan', 'Aziz', 'Timur', 'Nurlan', 'Rustam', 'Farid', 'Arman', 'Bekzod', 'Eldar', 'Yusuf', 'Tolga'
    ) then 'm' else 'f' end as pool
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email like '%@turanci-mock.invalid'
),
ranked as (
  select id, pool,
    row_number() over (partition by pool order by birthdate desc nulls last, id) - 1 as rnk,
    count(*) over (partition by pool) as cnt
  from mock
)
update public.profiles p
set avatar_url = 'https://turanci.expo.app/mock-faces/' || r.pool || '-'
  || lpad((floor(r.rnk * (case r.pool when 'm' then 44 else 30 end)::numeric / r.cnt) + 1)::int::text, 3, '0')
  || '.jpg'
from ranked r
where r.id = p.id;
