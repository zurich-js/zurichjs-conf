-- Additional local CFP load-test seed data.
-- This keeps the small reviewer dashboard fixtures and adds a denser dataset
-- for local testing with many speakers, submissions, tags, and reviews.

-- Extra reviewers
insert into public.cfp_reviewers (
  id,
  email,
  name,
  role,
  can_see_speaker_identity,
  invited_at,
  accepted_at,
  is_active
)
values
  ('80000000-0000-4000-8000-000000000001', 'reviewer.bulk.one@zurichjs.test', 'Bulk Reviewer One', 'reviewer', false, now(), now(), true),
  ('80000000-0000-4000-8000-000000000002', 'reviewer.bulk.two@zurichjs.test', 'Bulk Reviewer Two', 'reviewer', false, now(), now(), true),
  ('80000000-0000-4000-8000-000000000003', 'reviewer.bulk.three@zurichjs.test', 'Bulk Reviewer Three', 'reviewer', true, now(), now(), true)
on conflict (id) do update set
  email = excluded.email,
  name = excluded.name,
  role = excluded.role,
  can_see_speaker_identity = excluded.can_see_speaker_identity,
  accepted_at = excluded.accepted_at,
  is_active = excluded.is_active;

-- Extra tags
with generated_tags as (
  select
    ('81000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid as id,
    ('topic-' || lpad(series::text, 2, '0'))::text as name,
    true as is_suggested
  from generate_series(1, 24) as series
)
insert into public.cfp_tags (id, name, is_suggested)
select id, name, is_suggested
from generated_tags
on conflict (id) do update set
  name = excluded.name,
  is_suggested = excluded.is_suggested;

-- Intentional duplicate-like tags for manual merge testing in the admin UI
insert into public.cfp_tags (id, name, is_suggested)
values
  ('81000000-0000-4000-8000-000000009002', 'ai', false),
  ('81000000-0000-4000-8000-000000009004', 'agents', false)
on conflict (id) do update set
  name = excluded.name,
  is_suggested = excluded.is_suggested;

-- Extra speakers
with generated_speakers as (
  select
    series,
    ('82000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid as id,
    ('speaker+' || series::text || '@zurichjs.test')::text as email,
    ('Speaker' || series::text)::text as first_name,
    ('Load' || series::text)::text as last_name,
    case
      when series % 4 = 0 then 'Frontend Engineer'
      when series % 4 = 1 then 'Platform Engineer'
      when series % 4 = 2 then 'Developer Advocate'
      else 'Staff Engineer'
    end as job_title,
    ('Company ' || ((series - 1) % 12 + 1)::text)::text as company,
    ('Speaker ' || series::text || ' has a detailed CFP bio for local testing and seed coverage.')::text as bio
  from generate_series(1, 120) as series
)
insert into public.cfp_speakers (
  id,
  email,
  first_name,
  last_name,
  job_title,
  company,
  bio
)
select
  id,
  email,
  first_name,
  last_name,
  job_title,
  company,
  bio
from generated_speakers
on conflict (id) do update set
  email = excluded.email,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  job_title = excluded.job_title,
  company = excluded.company,
  bio = excluded.bio;

-- Extra submissions
with generated_submissions as (
  select
    series,
    ('83000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid as id,
    ('82000000-0000-4000-8000-' || lpad((((series - 1) % 120) + 1)::text, 12, '0'))::uuid as speaker_id,
    case
      when series % 11 = 0 then 'workshop'::public.cfp_submission_type
      when series % 5 = 0 then 'lightning'::public.cfp_submission_type
      else 'standard'::public.cfp_submission_type
    end as submission_type,
    case
      when series % 3 = 0 then 'beginner'::public.cfp_talk_level
      when series % 3 = 1 then 'intermediate'::public.cfp_talk_level
      else 'advanced'::public.cfp_talk_level
    end as talk_level,
    case
      when series % 7 = 0 then 'under_review'::public.cfp_submission_status
      when series % 9 = 0 then 'waitlisted'::public.cfp_submission_status
      when series % 13 = 0 then 'accepted'::public.cfp_submission_status
      when series % 17 = 0 then 'rejected'::public.cfp_submission_status
      else 'submitted'::public.cfp_submission_status
    end as status
  from generate_series(1, 360) as series
)
insert into public.cfp_submissions (
  id,
  speaker_id,
  title,
  abstract,
  submission_type,
  talk_level,
  workshop_duration_hours,
  status,
  submitted_at,
  metadata
)
select
  id,
  speaker_id,
  ('Load Test Submission ' || series::text) as title,
  (
    'This seeded submission exists to stress local CFP flows with many speakers, many submissions, and many tag joins. '
    || 'It includes enough abstract content to resemble a realistic proposal and make dashboard filtering and review workflows easier to test. '
    || 'Seed row ' || series::text || ' also spreads across several statuses and submission types.'
  ) as abstract,
  submission_type,
  talk_level,
  case
    when submission_type = 'workshop' then 4
    else null
  end as workshop_duration_hours,
  status,
  now() - make_interval(days => series % 45, hours => series % 12) as submitted_at,
  jsonb_build_object('seed_source', 'load-test', 'seed_index', series) as metadata
from generated_submissions
on conflict (id) do update set
  speaker_id = excluded.speaker_id,
  title = excluded.title,
  abstract = excluded.abstract,
  submission_type = excluded.submission_type,
  talk_level = excluded.talk_level,
  workshop_duration_hours = excluded.workshop_duration_hours,
  status = excluded.status,
  submitted_at = excluded.submitted_at,
  metadata = excluded.metadata;

-- Extra submission/tag links, 4 tags per submission
with generated_links as (
  select
    submission_id,
    tag_id
  from (
    select
      ('83000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid as submission_id,
      ('81000000-0000-4000-8000-' || lpad((((series - 1) % 24) + 1)::text, 12, '0'))::uuid as tag_id
    from generate_series(1, 360) as series

    union all

    select
      ('83000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid as submission_id,
      ('81000000-0000-4000-8000-' || lpad((((series + 4) % 24) + 1)::text, 12, '0'))::uuid as tag_id
    from generate_series(1, 360) as series

    union all

    select
      ('83000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid as submission_id,
      ('81000000-0000-4000-8000-' || lpad((((series + 9) % 24) + 1)::text, 12, '0'))::uuid as tag_id
    from generate_series(1, 360) as series

    union all

    select
      ('83000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid as submission_id,
      ('81000000-0000-4000-8000-' || lpad((((series + 14) % 24) + 1)::text, 12, '0'))::uuid as tag_id
    from generate_series(1, 360) as series
  ) as link_rows
)
insert into public.cfp_submission_tags (submission_id, tag_id)
select distinct submission_id, tag_id
from generated_links
on conflict (submission_id, tag_id) do nothing;

insert into public.cfp_submission_tags (submission_id, tag_id)
values
  ('83000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000009002'),
  ('83000000-0000-4000-8000-000000000003', '81000000-0000-4000-8000-000000009004'),
  ('83000000-0000-4000-8000-000000000004', '81000000-0000-4000-8000-000000009004')
on conflict (submission_id, tag_id) do nothing;

-- Extra reviews, 2 reviews for all seeded submissions and a 3rd review for most of them
with generated_reviews as (
  select
    row_number() over (order by submission_series, reviewer_sort) as row_id,
    submission_id,
    reviewer_id,
    submission_series
  from (
    select
      series as submission_series,
      ('83000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid as submission_id,
      reviewer_id,
      reviewer_sort
    from generate_series(1, 360) as series
    cross join (
      values
        ('80000000-0000-4000-8000-000000000001'::uuid, 1),
        ('80000000-0000-4000-8000-000000000002'::uuid, 2)
    ) as reviewers(reviewer_id, reviewer_sort)

    union all

    select
      series as submission_series,
      ('83000000-0000-4000-8000-' || lpad(series::text, 12, '0'))::uuid as submission_id,
      '80000000-0000-4000-8000-000000000003'::uuid as reviewer_id,
      3 as reviewer_sort
    from generate_series(1, 360) as series
    where series % 6 != 0
  ) as review_rows
)
insert into public.cfp_reviews (
  id,
  submission_id,
  reviewer_id,
  score_overall,
  score_relevance,
  score_technical_depth,
  score_clarity,
  score_diversity,
  private_notes,
  feedback_to_speaker
)
select
  ('84000000-0000-4000-8000-' || lpad(row_id::text, 12, '0'))::uuid as id,
  submission_id,
  reviewer_id,
  ((submission_series % 5) + 1) as score_overall,
  (((submission_series + 1) % 5) + 1) as score_relevance,
  (((submission_series + 2) % 5) + 1) as score_technical_depth,
  (((submission_series + 3) % 5) + 1) as score_clarity,
  (((submission_series + 4) % 5) + 1) as score_diversity,
  ('Seeded private note for submission ' || submission_series::text) as private_notes,
  ('Seeded speaker feedback for submission ' || submission_series::text) as feedback_to_speaker
from generated_reviews
on conflict (submission_id, reviewer_id) do update set
  score_overall = excluded.score_overall,
  score_relevance = excluded.score_relevance,
  score_technical_depth = excluded.score_technical_depth,
  score_clarity = excluded.score_clarity,
  score_diversity = excluded.score_diversity,
  private_notes = excluded.private_notes,
  feedback_to_speaker = excluded.feedback_to_speaker;
