-- CFP tag dedupe debugging
-- Use the SELECT sections first as a dry run.
-- If the results look right, run the mutation block inside a transaction.

-- 1. Duplicate groups by normalized tag name.
with normalized_tags as (
  select
    id,
    name,
    is_suggested,
    created_at,
    nullif(lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'))), '') as normalized_name
  from public.cfp_tags
)
select
  normalized_name,
  count(*) as duplicate_tag_count,
  array_agg(
    json_build_object(
      'id', id,
      'name', name,
      'is_suggested', is_suggested,
      'created_at', created_at
    )
    order by is_suggested desc, created_at asc, id asc
  ) as tags
from normalized_tags
where normalized_name is not null
group by normalized_name
having count(*) > 1
order by duplicate_tag_count desc, normalized_name asc;

-- 2. Exact submission/tag rows that would be rewritten to canonical tags.
with normalized_tags as (
  select
    id,
    name,
    nullif(lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'))), '') as normalized_name,
    first_value(id) over (
      partition by nullif(lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'))), '')
      order by is_suggested desc, created_at asc, id asc
    ) as canonical_tag_id
  from public.cfp_tags
),
tag_rewrites as (
  select
    duplicate_tags.id as duplicate_tag_id,
    duplicate_tags.name as duplicate_tag_name,
    duplicate_tags.normalized_name,
    canonical_tags.id as canonical_tag_id,
    canonical_tags.name as canonical_tag_name
  from normalized_tags as duplicate_tags
  join public.cfp_tags as canonical_tags
    on canonical_tags.id = duplicate_tags.canonical_tag_id
  where duplicate_tags.normalized_name is not null
    and duplicate_tags.id <> duplicate_tags.canonical_tag_id
)
select
  submission_tags.submission_id,
  tag_rewrites.duplicate_tag_id,
  tag_rewrites.duplicate_tag_name,
  tag_rewrites.canonical_tag_id,
  tag_rewrites.canonical_tag_name,
  tag_rewrites.normalized_name
from public.cfp_submission_tags as submission_tags
join tag_rewrites
  on tag_rewrites.duplicate_tag_id = submission_tags.tag_id
order by tag_rewrites.normalized_name, submission_tags.submission_id;

-- 3. Summary of how many submissions are affected per duplicate group.
with normalized_tags as (
  select
    id,
    name,
    nullif(lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'))), '') as normalized_name,
    first_value(id) over (
      partition by nullif(lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'))), '')
      order by is_suggested desc, created_at asc, id asc
    ) as canonical_tag_id
  from public.cfp_tags
),
tag_rewrites as (
  select
    id as duplicate_tag_id,
    normalized_name
  from normalized_tags
  where normalized_name is not null
    and id <> canonical_tag_id
)
select
  tag_rewrites.normalized_name,
  count(distinct submission_tags.submission_id) as affected_submissions,
  count(*) as affected_submission_tag_rows
from public.cfp_submission_tags as submission_tags
join tag_rewrites
  on tag_rewrites.duplicate_tag_id = submission_tags.tag_id
group by tag_rewrites.normalized_name
order by affected_submissions desc, tag_rewrites.normalized_name asc;

-- 4. Mutation block.
-- begin;
--
-- with normalized_tags as (
--   select
--     id,
--     nullif(lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'))), '') as normalized_name,
--     is_suggested,
--     created_at,
--     first_value(id) over (
--       partition by nullif(lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'))), '')
--       order by is_suggested desc, created_at asc, id asc
--     ) as canonical_tag_id,
--     bool_or(is_suggested) over (
--       partition by nullif(lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'))), '')
--     ) as canonical_is_suggested
--   from public.cfp_tags
-- ),
-- tag_rewrites as (
--   select
--     id as duplicate_tag_id,
--     canonical_tag_id
--   from normalized_tags
--   where normalized_name is not null
--     and id <> canonical_tag_id
-- ),
-- canonical_tags as (
--   select distinct on (canonical_tag_id)
--     canonical_tag_id,
--     normalized_name,
--     canonical_is_suggested
--   from normalized_tags
--   where normalized_name is not null
--   order by canonical_tag_id
-- )
-- insert into public.cfp_submission_tags (submission_id, tag_id)
-- select
--   submission_tags.submission_id,
--   tag_rewrites.canonical_tag_id
-- from public.cfp_submission_tags as submission_tags
-- join tag_rewrites
--   on tag_rewrites.duplicate_tag_id = submission_tags.tag_id
-- on conflict (submission_id, tag_id) do nothing;
--
-- with normalized_tags as (
--   select
--     id,
--     nullif(lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'))), '') as normalized_name,
--     first_value(id) over (
--       partition by nullif(lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'))), '')
--       order by is_suggested desc, created_at asc, id asc
--     ) as canonical_tag_id
--   from public.cfp_tags
-- ),
-- tag_rewrites as (
--   select
--     id as duplicate_tag_id
--   from normalized_tags
--   where normalized_name is not null
--     and id <> canonical_tag_id
-- )
-- delete from public.cfp_submission_tags as submission_tags
-- using tag_rewrites
-- where submission_tags.tag_id = tag_rewrites.duplicate_tag_id;
--
-- with normalized_tags as (
--   select
--     id,
--     nullif(lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'))), '') as normalized_name,
--     is_suggested,
--     created_at,
--     first_value(id) over (
--       partition by nullif(lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'))), '')
--       order by is_suggested desc, created_at asc, id asc
--     ) as canonical_tag_id,
--     bool_or(is_suggested) over (
--       partition by nullif(lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'))), '')
--     ) as canonical_is_suggested
--   from public.cfp_tags
-- ),
-- canonical_tags as (
--   select distinct on (canonical_tag_id)
--     canonical_tag_id,
--     normalized_name,
--     canonical_is_suggested
--   from normalized_tags
--   where normalized_name is not null
--   order by canonical_tag_id
-- )
-- update public.cfp_tags as tags
-- set
--   name = canonical_tags.normalized_name,
--   is_suggested = canonical_tags.canonical_is_suggested
-- from canonical_tags
-- where tags.id = canonical_tags.canonical_tag_id;
--
-- with normalized_tags as (
--   select
--     id,
--     nullif(lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'))), '') as normalized_name,
--     first_value(id) over (
--       partition by nullif(lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'))), '')
--       order by is_suggested desc, created_at asc, id asc
--     ) as canonical_tag_id
--   from public.cfp_tags
-- ),
-- tag_rewrites as (
--   select
--     id as duplicate_tag_id
--   from normalized_tags
--   where normalized_name is not null
--     and id <> canonical_tag_id
-- )
-- delete from public.cfp_tags as tags
-- using tag_rewrites
-- where tags.id = tag_rewrites.duplicate_tag_id;
--
-- select 'preview after mutation' as stage;
-- select
--   nullif(lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'))), '') as normalized_name,
--   count(*) as duplicate_tag_count
-- from public.cfp_tags
-- group by nullif(lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g'))), '')
-- having count(*) > 1;
--
-- rollback;
-- replace rollback with commit once you are happy with the result
