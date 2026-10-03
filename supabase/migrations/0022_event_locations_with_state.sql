-- Event places are free text; the Triangle ones already end in ", NC", but the
-- Tampa-area seed events were written without a state ("Ybor City, Tampa",
-- "Tampa Theatre"). Add ", FL" so event cards read "City, ST" like circle cards.
update public.circle_events e
set location = e.location || ', FL'
from public.circles c
where e.circle_id = c.id
  and c.state = 'FL'
  and e.location is not null
  and e.location not like 'Online%'
  and e.location !~ ', [A-Z]{2}$';
