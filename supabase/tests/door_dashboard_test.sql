-- Tests for 20260823000003_add_door_dashboard_function.sql
--
-- Run instructions are in supabase/tests/door_checkin_schema_test.sql.
-- The test fails if a boolean reads f, or if a count differs from the comment
-- above it.

\set ON_ERROR_STOP on
\pset pager off
BEGIN;
\set QUIET on
INSERT INTO public.checkin_staff (id,email,role) VALUES
  ('11111111-0000-4000-8000-0000000000a1','lead@z.com','door_lead'),
  ('11111111-0000-4000-8000-0000000000a2','scan@z.com','scanner');
INSERT INTO public.tickets (id,email,first_name,last_name,ticket_type,ticket_category,ticket_stage,status,amount_paid,currency,stripe_customer_id,stripe_session_id)
SELECT ('22222222-0000-4000-8000-' || lpad(g::text,12,'0'))::uuid, 'a'||g||'@x.com','A','B','standard','standard','general_admission','confirmed',30000,'CHF','cus_'||g,'cs_'||g
FROM generate_series(1,10) g;
-- one refunded, which must not count as expected
UPDATE public.tickets SET status='refunded' WHERE id='22222222-0000-4000-8000-000000000010';
-- three arrive on conference day
UPDATE public.tickets SET checked_in_conference_day_at=NOW(), checked_in_conference_day_by='11111111-0000-4000-8000-0000000000a2'
  WHERE id IN ('22222222-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000002','22222222-0000-4000-8000-000000000003');
UPDATE public.tickets SET goodie_handed_at=NOW() WHERE id='22222222-0000-4000-8000-000000000001';
INSERT INTO public.door_events (event_type,occasion,outcome,ticket_id,staff_id,staff_email,staff_role,station,occurred_at) VALUES
  ('checked_in','conference_day','applied','22222222-0000-4000-8000-000000000001','11111111-0000-4000-8000-0000000000a2','scan@z.com','scanner','lane-1',NOW()),
  ('checked_in','conference_day','applied','22222222-0000-4000-8000-000000000002','11111111-0000-4000-8000-0000000000a2','scan@z.com','scanner','lane-1',NOW()),
  ('manual_admit','conference_day','applied','22222222-0000-4000-8000-000000000003','11111111-0000-4000-8000-0000000000a1','lead@z.com','door_lead','desk',NOW()),
  ('checked_in','conference_day','duplicate','22222222-0000-4000-8000-000000000001','11111111-0000-4000-8000-0000000000a2','scan@z.com','scanner','lane-2',NOW());
-- Refusals carry a reason, enforced by the failure_reason CHECK constraint.
INSERT INTO public.door_events (event_type,occasion,outcome,staff_id,staff_email,staff_role,station,occurred_at,failure_reason) VALUES
  ('denied','conference_day','denied','11111111-0000-4000-8000-0000000000a2','scan@z.com','scanner','lane-1',NOW(),'ticket_refunded'),
  ('denied','conference_day','not_found','11111111-0000-4000-8000-0000000000a2','scan@z.com','scanner','lane-2',NOW(),'subject_not_found');
-- an event on the OTHER occasion, which must not leak into these figures
INSERT INTO public.door_events (event_type,occasion,outcome,staff_email,staff_role,station,occurred_at)
VALUES ('checked_in','workshop_day','applied','scan@z.com','scanner','lane-9',NOW());
\set QUIET off

\echo '### totals (9 confirmed of 10, 3 arrived, 1 goodie)'
SELECT d->>'expected' AS expected, d->>'arrived' AS arrived,
       d->>'remaining' AS remaining, d->>'goodieHandedOver' AS goodies
FROM public.door_dashboard('conference_day') d;

\echo ''
\echo '### throughput windows count only this occasion (want 3, not 4)'
SELECT d->>'arrivalsLast15Min' AS last15, d->>'arrivalsLast5Min' AS last5
FROM public.door_dashboard('conference_day') d;

\echo ''
\echo '### per station'
SELECT s->>'station' AS station, s->>'admitted' AS admitted,
       s->>'duplicates' AS dupes, s->>'refusals' AS refusals,
       (s->>'lastSeenAt') IS NOT NULL AS has_last_seen
FROM public.door_dashboard('conference_day') d,
     jsonb_array_elements(d->'stations') s;

\echo ''
\echo '### per volunteer'
SELECT v->>'staffEmail' AS who, v->>'staffRole' AS role,
       v->>'admitted' AS admitted, v->>'manualAdmits' AS manual
FROM public.door_dashboard('conference_day') d,
     jsonb_array_elements(d->'volunteers') v;

\echo ''
\echo '### anomalies'
SELECT d->'anomalies'->>'refusals' AS refusals, d->'anomalies'->>'notFound' AS not_found,
       d->'anomalies'->>'manualAdmits' AS manual, d->'anomalies'->>'duplicates' AS dupes
FROM public.door_dashboard('conference_day') d;

\echo ''
\echo '### workshop day counts registrations, including ticketless attendees'
\set QUIET on
INSERT INTO public.workshops (id,title,description,capacity,enrolled_count,currency,status)
VALUES ('44444444-0000-4000-8000-000000000001','WS','d',20,0,'CHF','published');
INSERT INTO public.workshop_registrations (id,workshop_id,ticket_id,email,status,amount_paid,currency,stripe_session_id,seat_index)
VALUES ('33333333-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000001',NULL,'no-ticket@x.com','confirmed',20000,'CHF','cs_w1',0),
       ('33333333-0000-4000-8000-000000000002','44444444-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000001','a1@x.com','confirmed',20000,'CHF','cs_w2',0);
UPDATE public.workshop_registrations SET checked_in=TRUE, checked_in_at=NOW() WHERE id='33333333-0000-4000-8000-000000000001';
\set QUIET off
SELECT d->>'expected' AS expected, d->>'arrived' AS arrived
FROM public.door_dashboard('workshop_day') d;

\echo ''
\echo '### payload stays small regardless of door volume'
SELECT length(public.door_dashboard('conference_day')::text) < 2000 AS "under 2KB";

\echo ''
\echo '### no attendee names or emails in the payload'
SELECT public.door_dashboard('conference_day')::text NOT LIKE '%a1@x.com%' AS "no attendee email",
       public.door_dashboard('conference_day')::text NOT LIKE '%no-ticket%' AS "no registrant email";

\echo ''
\echo '### not callable by client roles'
SELECT has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authed,
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='door_dashboard';
ROLLBACK;
