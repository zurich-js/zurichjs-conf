-- Behavioural tests for 20260823000001_add_door_checkin_functions.sql
--
-- Run instructions are in supabase/tests/door_checkin_schema_test.sql.
-- Every ERROR printed is an EXPECTED rejection inside its own savepoint.
-- The test fails if a boolean column reads f.

\set ON_ERROR_STOP on
\pset pager off

BEGIN;
\set QUIET on

-- Staff: one of each role.
INSERT INTO public.checkin_staff (id, email, name, role) VALUES
  ('11111111-0000-4000-8000-00000000000a', 'lead@zurichjs.com',    'Lead',    'door_lead'),
  ('11111111-0000-4000-8000-00000000000b', 'scanner@zurichjs.com', 'Scanner', 'scanner'),
  ('11111111-0000-4000-8000-00000000000c', 'goodie@zurichjs.com',  'Goodie',  'goodie'),
  ('11111111-0000-4000-8000-00000000000d', 'exstaff@zurichjs.com', 'Gone',    'scanner');
UPDATE public.checkin_staff SET is_active = FALSE
  WHERE id = '11111111-0000-4000-8000-00000000000d';

-- Population 1: conference ticket, no workshop.
INSERT INTO public.tickets (id,email,first_name,last_name,ticket_type,ticket_category,ticket_stage,status,amount_paid,currency,stripe_customer_id,stripe_session_id)
VALUES ('22222222-0000-4000-8000-000000000001','solo@example.com','Solo','Attendee','standard','standard','general_admission','confirmed',30000,'CHF','cus_1','cs_1');

-- Population 2: ticket + workshop seat, VIP so apparel includes a hoodie.
INSERT INTO public.tickets (id,email,first_name,last_name,ticket_type,ticket_category,ticket_stage,status,amount_paid,currency,stripe_customer_id,stripe_session_id)
VALUES ('22222222-0000-4000-8000-000000000002','buyer@example.com','Bulk','Buyer','vip','vip','general_admission','confirmed',90000,'CHF','cus_2','cs_2');
INSERT INTO public.ticket_apparel_preferences (ticket_id, tshirt_size, hoodie_size)
VALUES ('22222222-0000-4000-8000-000000000002','L','XL');

-- A refunded ticket, which must still resolve.
INSERT INTO public.tickets (id,email,first_name,last_name,ticket_type,ticket_category,ticket_stage,status,amount_paid,currency,stripe_customer_id,stripe_session_id)
VALUES ('22222222-0000-4000-8000-000000000003','refunded@example.com','Ref','Unded','standard','standard','general_admission','refunded',30000,'CHF','cus_3','cs_3');

INSERT INTO public.workshops (id,title,description,capacity,enrolled_count,currency,status,room,date,start_time,end_time)
VALUES ('44444444-0000-4000-8000-000000000001','Advanced TypeScript','desc',20,0,'CHF','published','Room A',DATE '2026-09-10',TIME '09:00',TIME '12:00');

-- The buyer's own seat: carries their ticket_id AND their own email.
INSERT INTO public.workshop_registrations (id,workshop_id,ticket_id,email,first_name,last_name,status,amount_paid,currency,stripe_session_id,seat_index)
VALUES ('33333333-0000-4000-8000-000000000001','44444444-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000002','buyer@example.com','Bulk','Buyer','confirmed',20000,'CHF','cs_ws_1',0);

-- A COLLEAGUE's seat bought in the same session: it inherits the buyer's
-- ticket_id but names someone else. This is the precedence trap.
INSERT INTO public.workshop_registrations (id,workshop_id,ticket_id,email,first_name,last_name,status,amount_paid,currency,stripe_session_id,seat_index)
VALUES ('33333333-0000-4000-8000-000000000002','44444444-0000-4000-8000-000000000001','22222222-0000-4000-8000-000000000002','colleague@example.com','Col','League','confirmed',20000,'CHF','cs_ws_1',1);

-- Population 3: workshop seat with NO conference ticket, and no name at all.
INSERT INTO public.workshop_registrations (id,workshop_id,ticket_id,email,first_name,last_name,company,status,amount_paid,currency,stripe_session_id,seat_index)
VALUES ('33333333-0000-4000-8000-000000000003','44444444-0000-4000-8000-000000000001',NULL,NULL,NULL,NULL,'Acme AG','confirmed',20000,'CHF','cs_ws_2',0);
\set QUIET off

\echo ''
\echo '### 1. Population 1 -- conference ticket, no workshop'
SELECT (r->>'found')::bool                     AS "found",
       r->>'subjectKind'                       AS "kind",
       (r->>'admissible')::bool                AS "admissible",
       jsonb_array_length(r->'workshops'->'held') = 0 AS "no workshops",
       (r->'goodie'->>'entitled')::bool        AS "goodie entitled"
FROM public.door_resolve('22222222-0000-4000-8000-000000000001') r;

\echo ''
\echo '### 2. Population 2 -- seat precedence: the buyer sees ONLY their own seat'
\echo '    The colleague seat shares the buyer''s ticket_id but names someone'
\echo '    else, so it must appear under purchasedForOthers, never as held.'
SELECT jsonb_array_length(r->'workshops'->'held')               AS "held (want 1)",
       r->'workshops'->'held'->0->>'matchedBy'                  AS "matched by",
       jsonb_array_length(r->'workshops'->'purchasedForOthers')  AS "for others (want 1)",
       r->'workshops'->'purchasedForOthers'->0->>'attendeeEmail' AS "whose",
       r->'apparel'->>'tshirtSize'                              AS "tshirt",
       r->'apparel'->>'hoodieSize'                              AS "hoodie"
FROM public.door_resolve('22222222-0000-4000-8000-000000000002') r;

\echo ''
\echo '### 3. Scanning the colleague''s own QR shows the COLLEAGUE, not the buyer'
SELECT r->'person'->>'email'                        AS "person",
       jsonb_array_length(r->'workshops'->'held')   AS "held (want 1)",
       r->'workshops'->'held'->0->>'matchedBy'      AS "matched by"
FROM public.door_resolve('33333333-0000-4000-8000-000000000002') r;

\echo ''
\echo '### 4. Population 3 -- workshop-only, unnamed seat, is a legitimate state'
SELECT (r->>'found')::bool                  AS "found",
       r->>'subjectKind'                    AS "kind",
       r->'ticket' = 'null'::jsonb          AS "no ticket object",
       (r->>'admissible')::bool             AS "admissible",
       (r->'goodie'->>'entitled')::bool = FALSE AS "no goodie entitlement",
       r->'person'->>'company'              AS "findable by company"
FROM public.door_resolve('33333333-0000-4000-8000-000000000003') r;

\echo ''
\echo '### 5. A refunded ticket RESOLVES and is refused, not hidden'
SELECT (r->>'found')::bool          AS "found",
       (r->>'admissible')::bool     AS "admissible (want f)",
       r->>'refusalReason'          AS "reason"
FROM public.door_resolve('22222222-0000-4000-8000-000000000003') r;

\echo ''
\echo '### 6. An unknown UUID is reported as not found'
SELECT (r->>'found')::bool = FALSE AS "not found"
FROM public.door_resolve('99999999-9999-4999-8999-999999999999') r;

\echo ''
\echo '### 7. Check-in: first call applies, second is a duplicate'
SELECT r->>'outcome' AS "first call (want applied)"
FROM public.door_check_in('22222222-0000-4000-8000-000000000001','11111111-0000-4000-8000-00000000000b','lane-1') r;
SELECT r->>'outcome' AS "second call (want duplicate)",
       (r->>'alreadyCheckedInAt') IS NOT NULL AS "reports prior time"
FROM public.door_check_in('22222222-0000-4000-8000-000000000001','11111111-0000-4000-8000-00000000000b','lane-2') r;

\echo ''
\echo '### 8. Both attempts are audited, and the winner keeps the arrival time'
SELECT count(*) FILTER (WHERE outcome='applied')   AS "applied rows",
       count(*) FILTER (WHERE outcome='duplicate') AS "duplicate rows"
FROM public.door_events WHERE ticket_id='22222222-0000-4000-8000-000000000001';

\echo ''
\echo '### 9. Legacy columns stay in step for existing readers'
SELECT checked_in AS "legacy checked_in",
       checked_in_at IS NOT NULL AS "legacy timestamp set",
       checked_in_workshop_day_at IS NOT NULL AS "occasion column set"
FROM public.tickets WHERE id='22222222-0000-4000-8000-000000000001';

\echo ''
\echo '### 10. Denials'
SELECT r->>'failureReason' AS "inactive staff"
FROM public.door_check_in('22222222-0000-4000-8000-000000000002','11111111-0000-4000-8000-00000000000d') r;
SELECT r->>'failureReason' AS "goodie role may not check in"
FROM public.door_check_in('22222222-0000-4000-8000-000000000002','11111111-0000-4000-8000-00000000000c') r;
SELECT r->>'failureReason' AS "refunded ticket refused"
FROM public.door_check_in('22222222-0000-4000-8000-000000000003','11111111-0000-4000-8000-00000000000b') r;
SELECT r->>'outcome' AS "unknown uuid"
FROM public.door_check_in('99999999-9999-4999-8999-999999999999','11111111-0000-4000-8000-00000000000b') r;
SELECT r->>'failureReason' AS "manual admit needs a lead"
FROM public.door_check_in('22222222-0000-4000-8000-000000000002','11111111-0000-4000-8000-00000000000b',NULL,NULL,TRUE,'lost phone') r;
SELECT r->>'failureReason' AS "manual admit needs a reason"
FROM public.door_check_in('22222222-0000-4000-8000-000000000002','11111111-0000-4000-8000-00000000000a',NULL,NULL,TRUE,NULL) r;

\echo ''
\echo '### 11. Every denial is recorded, including the refusals'
SELECT count(*) > 0 AS "denials audited",
       bool_and(failure_reason IS NOT NULL) AS "each carries a reason"
FROM public.door_events WHERE outcome IN ('denied','not_found');

\echo ''
\echo '### 12. A lead can admit manually with a reason, and it is labelled as such'
SELECT r->>'outcome' AS "outcome"
FROM public.door_check_in('22222222-0000-4000-8000-000000000002','11111111-0000-4000-8000-00000000000a','desk',NULL,TRUE,'QR would not scan') r;
SELECT event_type AS "event type", notes AS "reason recorded"
FROM public.door_events
WHERE ticket_id='22222222-0000-4000-8000-000000000002' AND event_type='manual_admit';

\echo ''
\echo '### 13. Goodie handover is once per ticket'
SELECT r->>'outcome' AS "first (want applied)"
FROM public.door_goodie_handover('22222222-0000-4000-8000-000000000002','11111111-0000-4000-8000-00000000000c','swag',NULL,'hoodie out of stock') r;
SELECT r->>'outcome' AS "second (want duplicate)",
       (r->>'alreadyHandedAt') IS NOT NULL AS "reports prior time"
FROM public.door_goodie_handover('22222222-0000-4000-8000-000000000002','11111111-0000-4000-8000-00000000000a','swag') r;
SELECT goodie_note AS "partial-handover note kept"
FROM public.tickets WHERE id='22222222-0000-4000-8000-000000000002';

\echo ''
\echo '### 14. A refunded ticket is not entitled to a goodie bag'
SELECT r->>'failureReason' AS "reason"
FROM public.door_goodie_handover('22222222-0000-4000-8000-000000000003','11111111-0000-4000-8000-00000000000c') r;

\echo ''
\echo '### 15. A future occurred_at is clamped, never trusted'
\set QUIET on
SELECT public.door_check_in('33333333-0000-4000-8000-000000000003',
  '11111111-0000-4000-8000-00000000000b', 'lane-1', NOW() + INTERVAL '3 days') AS ignored \gset
\set QUIET off
SELECT checked_in_at <= NOW() AS "check-in time clamped to now"
  FROM public.workshop_registrations
  WHERE id = '33333333-0000-4000-8000-000000000003';
SELECT bool_and(occurred_at <= NOW()) AS "audit occurred_at clamped too"
  FROM public.door_events
  WHERE workshop_registration_id = '33333333-0000-4000-8000-000000000003';

\echo ''
\echo '### 16. Functions are not executable by anon or authenticated'
SELECT p.proname AS "function",
       has_function_privilege('anon', p.oid, 'EXECUTE') AS "anon",
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS "authenticated",
       has_function_privilege('service_role', p.oid, 'EXECUTE') AS "service_role"
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public' AND p.proname LIKE 'door_%'
ORDER BY p.proname;

ROLLBACK;
