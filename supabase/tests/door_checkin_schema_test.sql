-- Behavioural tests for 20260823000000_add_door_checkin_schema.sql
--
-- CI has no database, so this is run by hand against a scratch cluster:
--
--   createdb zjs_test
--   for f in supabase/migrations/*.sql; do psql -d zjs_test -v ON_ERROR_STOP=1 -f "$f"; done
--   psql -d zjs_test -f supabase/tests/door_checkin_schema_test.sql
--
-- Against a local Supabase (`supabase start`) the roles and auth schema already
-- exist. Against a bare Postgres you also need the anon/authenticated/
-- service_role roles and an auth.users table.
--
-- Every ERROR printed below is an EXPECTED rejection, each wrapped in its own
-- savepoint so a rejection rolls back only that statement instead of aborting
-- the test transaction. The test fails if an expected ERROR does NOT appear, or
-- if any boolean column reads f.

\set ON_ERROR_STOP on
\pset pager off

BEGIN;

\set QUIET on
INSERT INTO auth.users (id, email)
VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'lead@zurichjs.com');

INSERT INTO public.checkin_staff (id, email, name, user_id, role) VALUES
  ('11111111-0000-4000-8000-000000000001', 'lead@zurichjs.com', 'Lead',
   'aaaaaaaa-0000-4000-8000-000000000001', 'door_lead'),
  ('11111111-0000-4000-8000-000000000002', 'scanner@zurichjs.com', 'Scanner', NULL, 'scanner');

INSERT INTO public.tickets (
  id, email, first_name, last_name, ticket_type, ticket_category, ticket_stage,
  status, amount_paid, currency, stripe_customer_id, stripe_session_id
) VALUES (
  '22222222-0000-4000-8000-000000000001', 'Attendee@Example.com', 'Ada', 'Lovelace',
  'standard', 'standard', 'general_admission', 'confirmed', 30000, 'CHF', 'cus_1', 'cs_1'
);
\set QUIET off

\echo ''
\echo '### 1. Conditional UPDATE is atomic and idempotent'
\echo '    Two stations race the same conference-day check-in. This is the'
\echo '    property that replaces SELECT ... FOR UPDATE, so it matters most.'
UPDATE public.tickets SET
    checked_in_conference_day_at = NOW(),
    checked_in_conference_day_by = '11111111-0000-4000-8000-000000000001'
  WHERE id = '22222222-0000-4000-8000-000000000001'
    AND checked_in_conference_day_at IS NULL;
UPDATE public.tickets SET
    checked_in_conference_day_at = NOW(),
    checked_in_conference_day_by = '11111111-0000-4000-8000-000000000002'
  WHERE id = '22222222-0000-4000-8000-000000000001'
    AND checked_in_conference_day_at IS NULL;
SELECT checked_in_conference_day_by = '11111111-0000-4000-8000-000000000001'
         AS "first writer wins; arrival time not overwritten"
  FROM public.tickets WHERE id = '22222222-0000-4000-8000-000000000001';

\echo ''
\echo '### 2. Occasions are independent, so day-two re-entry is a fresh check-in'
SELECT checked_in_workshop_day_at IS NULL       AS "workshop day still open",
       checked_in_conference_day_at IS NOT NULL AS "conference day done"
  FROM public.tickets WHERE id = '22222222-0000-4000-8000-000000000001';

\echo ''
\echo '### 3. door_events is append-only'
INSERT INTO public.door_events
  (event_type, occasion, outcome, ticket_id, staff_id, staff_email, staff_role, station, occurred_at)
VALUES
  ('checked_in', 'conference_day', 'applied', '22222222-0000-4000-8000-000000000001',
   '11111111-0000-4000-8000-000000000001', 'lead@zurichjs.com', 'door_lead', 'lane-1', NOW());

\set ON_ERROR_STOP off
\echo '-- expect rejection: UPDATE'
SAVEPOINT expect_1;
UPDATE public.door_events SET notes = 'tampered';
ROLLBACK TO SAVEPOINT expect_1;
\echo '-- expect rejection: DELETE'
SAVEPOINT expect_2;
DELETE FROM public.door_events;
ROLLBACK TO SAVEPOINT expect_2;
\echo '-- expect rejection: TRUNCATE'
SAVEPOINT expect_3;
TRUNCATE public.door_events;
ROLLBACK TO SAVEPOINT expect_3;

\echo ''
\echo '### 4. CHECK constraints'
\echo '-- expect rejection: a denial with no reason'
SAVEPOINT expect_4;
INSERT INTO public.door_events (event_type,occasion,outcome,staff_email,staff_role,occurred_at)
VALUES ('denied','conference_day','denied','x@y.com','scanner',NOW());
ROLLBACK TO SAVEPOINT expect_4;
\echo '-- expect rejection: a success carrying a reason'
SAVEPOINT expect_5;
INSERT INTO public.door_events (event_type,occasion,outcome,staff_email,staff_role,occurred_at,failure_reason)
VALUES ('checked_in','conference_day','applied','x@y.com','scanner',NOW(),'why');
ROLLBACK TO SAVEPOINT expect_5;
\echo '-- expect rejection: an occasion that is not one of the two door days'
SAVEPOINT expect_6;
INSERT INTO public.door_events (event_type,occasion,outcome,staff_email,staff_role,occurred_at)
VALUES ('checked_in','community_day','applied','x@y.com','scanner',NOW());
ROLLBACK TO SAVEPOINT expect_6;
\echo '-- expect rejection: an unknown staff role'
SAVEPOINT expect_7;
INSERT INTO public.checkin_staff (email, role) VALUES ('a@b.com','superuser');
ROLLBACK TO SAVEPOINT expect_7;
\echo '-- expect rejection: a non-lowercased staff email'
SAVEPOINT expect_8;
INSERT INTO public.checkin_staff (email, role) VALUES ('MiXeD@b.com','scanner');
ROLLBACK TO SAVEPOINT expect_8;
\echo '-- expect rejection: a duplicate staff email'
SAVEPOINT expect_9;
INSERT INTO public.checkin_staff (email, role) VALUES ('lead@zurichjs.com','scanner');
ROLLBACK TO SAVEPOINT expect_9;
\echo '-- expect rejection: two staff rows sharing one auth user'
SAVEPOINT expect_10;
INSERT INTO public.checkin_staff (email, role, user_id)
VALUES ('dup@b.com','scanner','aaaaaaaa-0000-4000-8000-000000000001');
ROLLBACK TO SAVEPOINT expect_10;
\set ON_ERROR_STOP on

\echo ''
\echo '### 5. Erasing an attendee de-identifies the audit row without destroying it'
\echo '    ON DELETE SET NULL is an internal UPDATE, so this also proves the'
\echo '    append-only trigger does not block a legitimate erasure.'
DELETE FROM public.tickets WHERE id = '22222222-0000-4000-8000-000000000001';
SELECT count(*) = 1                                AS "audit row survives",
       bool_and(ticket_id IS NULL)                 AS "subject de-identified",
       bool_and(staff_email = 'lead@zurichjs.com') AS "actor snapshot retained"
  FROM public.door_events;

\echo ''
\echo '### 6. Removing a staff member keeps their audit rows'
DELETE FROM public.checkin_staff WHERE id = '11111111-0000-4000-8000-000000000001';
SELECT count(*) = 1              AS "audit row survives",
       bool_and(staff_id IS NULL) AS "actor reference cleared",
       bool_and(staff_email = 'lead@zurichjs.com' AND staff_role = 'door_lead')
                                  AS "who, and their role at the time, retained"
  FROM public.door_events;

\echo ''
\echo '### 7. The UPDATE exception is narrow'
\set QUIET on
INSERT INTO public.tickets (id,email,first_name,last_name,ticket_type,ticket_category,ticket_stage,status,amount_paid,currency,stripe_customer_id,stripe_session_id)
VALUES ('22222222-0000-4000-8000-000000000009','other@example.com','Grace','Hopper','standard','standard','general_admission','confirmed',30000,'CHF','cus_9','cs_9');
INSERT INTO public.checkin_staff (id,email,role)
VALUES ('11111111-0000-4000-8000-000000000009','other@zurichjs.com','scanner');
INSERT INTO public.door_events (id,event_type,occasion,outcome,ticket_id,staff_id,staff_email,staff_role,occurred_at)
VALUES ('33333333-0000-4000-8000-000000000001','checked_in','workshop_day','applied',
        '22222222-0000-4000-8000-000000000009','11111111-0000-4000-8000-000000000009',
        'other@zurichjs.com','scanner',NOW());
\set QUIET off
\set ON_ERROR_STOP off
\echo '-- expect rejection: repointing a reference to a different row'
SAVEPOINT expect_11;
UPDATE public.door_events SET ticket_id = '22222222-0000-4000-8000-000000000001'
  WHERE id = '33333333-0000-4000-8000-000000000001';
ROLLBACK TO SAVEPOINT expect_11;
\echo '-- expect rejection: editing content while clearing a reference'
SAVEPOINT expect_12;
UPDATE public.door_events SET ticket_id = NULL, notes = 'sneaky'
  WHERE id = '33333333-0000-4000-8000-000000000001';
ROLLBACK TO SAVEPOINT expect_12;
\echo '-- expect rejection: rewriting the actor snapshot'
SAVEPOINT expect_13;
UPDATE public.door_events SET staff_email = 'someone@else.com'
  WHERE id = '33333333-0000-4000-8000-000000000001';
ROLLBACK TO SAVEPOINT expect_13;
\set ON_ERROR_STOP on
\echo '-- permitted: clearing a reference alone, which is what a foreign key does'
UPDATE public.door_events SET staff_id = NULL
  WHERE id = '33333333-0000-4000-8000-000000000001';
SELECT staff_id IS NULL                        AS "reference cleared",
       staff_email = 'other@zurichjs.com'      AS "actor snapshot intact"
  FROM public.door_events WHERE id = '33333333-0000-4000-8000-000000000001';

\echo ''
\echo '### 8. Grants: anon and authenticated reach neither table;'
\echo '    service_role can read and append to door_events but not rewrite it'
SELECT c.relname AS "table", r.rolname AS "role",
       has_table_privilege(r.rolname, 'public.'||c.relname, 'SELECT') AS "select",
       has_table_privilege(r.rolname, 'public.'||c.relname, 'INSERT') AS "insert",
       has_table_privilege(r.rolname, 'public.'||c.relname, 'UPDATE') AS "update",
       has_table_privilege(r.rolname, 'public.'||c.relname, 'DELETE') AS "delete"
FROM pg_class c
CROSS JOIN (SELECT unnest(ARRAY['anon','authenticated','service_role']) AS rolname) r
WHERE c.relname IN ('checkin_staff','door_events')
ORDER BY c.relname, r.rolname;

\echo ''
\echo '### 9. RLS is enabled on both new tables'
SELECT relname AS "table", relrowsecurity AS "rls enabled"
  FROM pg_class WHERE relname IN ('checkin_staff','door_events') ORDER BY relname;

\echo ''
\echo '### 10. The planner uses the new case-insensitive email index'
SET enable_seqscan = off;
EXPLAIN (COSTS OFF)
  SELECT id FROM public.tickets WHERE lower(email) = 'attendee@example.com';

ROLLBACK;
