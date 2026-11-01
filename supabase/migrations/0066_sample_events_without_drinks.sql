-- App Review sees the sample world (0065), and the age rating answers "None" for
-- alcohol references, so the two sample mixers meet over tea and coffee.
update public.circle_events
set description = 'Tea, coffee and introductions with founders and professionals.'
where title = 'Founders & Professionals Mixer'
  and circle_id in (select circle_id from public.sample_circles);

update public.circle_events
set description = 'Coffee and conversation with professionals across the diaspora.'
where title = 'Apex Business Mixer'
  and circle_id in (select circle_id from public.sample_circles);
