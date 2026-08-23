-- Tests for 20260822000001_add_rls_to_volunteer_tables.sql
--
-- Run against a scratch cluster with the migrations applied:
--   createdb zjs_test
--   for f in supabase/migrations/*.sql; do psql -d zjs_test -v ON_ERROR_STOP=1 -f "$f"; done
--   psql -d zjs_test -f supabase/tests/volunteer_rls_test.sql
--
-- Every ERROR printed is an EXPECTED rejection, each in its own savepoint so it
-- does not abort the test transaction. The test fails if a boolean reads f in
-- sections 1-3, or t anywhere in section 4.

\set ON_ERROR_STOP on
\pset pager off

BEGIN;

\echo ''
\echo '### 1. Row level security is enabled on all three tables'
SELECT relname AS "table", relrowsecurity AS "rls enabled"
  FROM pg_class
  WHERE relname IN ('volunteer_roles','volunteer_applications','volunteer_profiles')
  ORDER BY relname;

\echo ''
\echo '### 2. No policies exist, so RLS denies by default'
\echo '    An enabled-with-no-policies table is closed, not open.'
SELECT c.relname AS "table",
       (SELECT count(*) FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = c.relname) = 0 AS "no policies"
  FROM pg_class c
  WHERE c.relname IN ('volunteer_roles','volunteer_applications','volunteer_profiles')
  ORDER BY c.relname;

\echo ''
\echo '### 3. service_role retains full access for the admin surface'
SELECT c.relname AS "table",
       has_table_privilege('service_role','public.'||c.relname,'SELECT') AS "select",
       has_table_privilege('service_role','public.'||c.relname,'INSERT') AS "insert",
       has_table_privilege('service_role','public.'||c.relname,'UPDATE') AS "update",
       has_table_privilege('service_role','public.'||c.relname,'DELETE') AS "delete"
  FROM pg_class c
  WHERE c.relname IN ('volunteer_roles','volunteer_applications','volunteer_profiles')
  ORDER BY c.relname;

\echo ''
\echo '### 4. anon and authenticated hold NO privilege (every value must be f)'
\echo '    The revoke matters independently of RLS: privileges filter columns,'
\echo '    RLS filters rows. Only the grant stops a future policy carrying email'
\echo '    and phone along with the row.'
SELECT c.relname AS "table", r.rolname AS "role",
       has_table_privilege(r.rolname,'public.'||c.relname,'SELECT') AS "select",
       has_table_privilege(r.rolname,'public.'||c.relname,'INSERT') AS "insert",
       has_table_privilege(r.rolname,'public.'||c.relname,'UPDATE') AS "update",
       has_table_privilege(r.rolname,'public.'||c.relname,'DELETE') AS "delete"
  FROM pg_class c
  CROSS JOIN (SELECT unnest(ARRAY['anon','authenticated']) AS rolname) r
  WHERE c.relname IN ('volunteer_roles','volunteer_applications','volunteer_profiles')
  ORDER BY c.relname, r.rolname;

\echo ''
\echo '### 5. A client role genuinely cannot reach the data'
\set QUIET on
INSERT INTO public.volunteer_roles (id, title, slug, commitment_type, status)
VALUES ('55555555-0000-4000-8000-000000000001','Door crew','door-crew','conference_day','published');
INSERT INTO public.volunteer_profiles (id, first_name, last_name, email, phone, linkedin_url)
VALUES ('66666666-0000-4000-8000-000000000001','Vol','Unteer','vol@example.com','+41790000000','https://linkedin.com/in/vol');
\set QUIET off

-- Expected rejections follow, so stop halting on error. Each is wrapped in a
-- savepoint; SET LOCAL ROLE is transaction-scoped and is restored by the
-- rollback, so the role does not leak into the next case.
\set ON_ERROR_STOP off

\echo '-- expect rejection: anon reading volunteer_profiles PII'
SAVEPOINT expect_1;
SET LOCAL ROLE anon;
SELECT email, phone FROM public.volunteer_profiles;
ROLLBACK TO SAVEPOINT expect_1;

\echo '-- expect rejection: anon deleting volunteer profiles'
SAVEPOINT expect_2;
SET LOCAL ROLE anon;
DELETE FROM public.volunteer_profiles;
ROLLBACK TO SAVEPOINT expect_2;

\echo '-- expect rejection: anon reading applications'
SAVEPOINT expect_3;
SET LOCAL ROLE anon;
SELECT * FROM public.volunteer_applications;
ROLLBACK TO SAVEPOINT expect_3;

\echo '-- expect rejection: authenticated rewriting a role posting'
SAVEPOINT expect_4;
SET LOCAL ROLE authenticated;
UPDATE public.volunteer_roles SET title = 'hijacked';
ROLLBACK TO SAVEPOINT expect_4;

\set ON_ERROR_STOP on

\echo '-- permitted: service_role still reads its own data'
SET LOCAL ROLE service_role;
SELECT count(*) = 1 AS "service_role can read profiles" FROM public.volunteer_profiles;
RESET ROLE;

ROLLBACK;
