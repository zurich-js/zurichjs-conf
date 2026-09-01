-- Door check-in seed overlay.
--
-- WHY THIS EXISTS
-- A Supabase branch starts with NO data — deliberately, so production PII never
-- lands on a preview instance. That means a freshly created staging branch has
-- nothing to scan: the door station's roster is empty, every code resolves to
-- "not in today's roster", and the whole flow is untestable. This overlay is the
-- minimum dataset that exercises every branch of the door logic.
--
-- Each row below exists to test something specific, noted inline. If you remove
-- one, you lose the case it covers.
--
-- Safe on production by construction: seed files are never applied to the
-- production project, only to branches and to local `supabase db start`.
--
-- Apply locally with:  pnpm db:seed:door-checkin
-- On staging it runs automatically via [remotes.staging.db.seed] in config.toml.

begin;

-- Deterministic UUIDs so a re-seed is idempotent and so the ids can be pasted
-- into a URL when testing by hand. The QR payload the badges carry is
-- ${baseUrl}/validate/<ticket id>, so these ARE the scannable codes.
--   Conference attendees:  1111...0001 .. 0007
--   Workshop-only seats:   2222...0001 .. 0002

-- ─────────────────────────────────────────────────────────────────────────────
-- Conference tickets
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.tickets (
    id, first_name, last_name, email, company, job_title,
    ticket_type, ticket_category, ticket_stage, status,
    amount_paid, currency, stripe_customer_id, stripe_session_id,
    checked_in_workshop_day_at, checked_in_conference_day_at,
    goodie_handed_at, goodie_note, door_note,
    transferred_from_name, transferred_from_email
) values
    -- The ordinary case: confirmed, not yet arrived, has apparel sizes.
    ('11111111-0000-4000-8000-000000000001', 'Ada', 'Lovelace', 'ada@example.com',
     'Analytical Engines', 'Engineer', 'standard', 'standard', 'early_bird', 'confirmed',
     39000, 'CHF', 'cus_seed_001', 'cs_seed_001', null, null, null, null, null, null, null),

    -- Already checked in for the conference day: re-scanning must show
    -- "Already checked in at …" rather than admitting a second time.
    ('11111111-0000-4000-8000-000000000002', 'Grace', 'Hopper', 'grace@example.com',
     'Navy', 'Rear Admiral', 'standard', 'standard', 'early_bird', 'confirmed',
     39000, 'CHF', 'cus_seed_002', 'cs_seed_002',
     null, '2026-09-11T07:14:00Z', null, null, null, null, null),

    -- Goodie already handed over: the handover button must not offer a second bag.
    ('11111111-0000-4000-8000-000000000003', 'Alan', 'Kay', 'alan.kay@example.com',
     'Xerox PARC', 'Researcher', 'standard', 'standard', 'general_admission', 'confirmed',
     45000, 'CHF', 'cus_seed_003', 'cs_seed_003',
     null, '2026-09-11T07:20:00Z', '2026-09-11T07:21:00Z', null, null, null, null),

    -- Partial handover: exercises the goodie NOTE path, where only part of the
    -- entitlement was given out.
    ('11111111-0000-4000-8000-000000000004', 'Barbara', 'Liskov', 'barbara@example.com',
     'MIT', 'Professor', 'standard', 'standard', 'general_admission', 'confirmed',
     45000, 'CHF', 'cus_seed_004', 'cs_seed_004',
     null, '2026-09-11T07:32:00Z', '2026-09-11T07:33:00Z',
     'T-shirt given, hoodie out of stock in M', null, null, null),

    -- REFUNDED. Must still resolve at the door and be shown as refused with a
    -- reason: omitting it makes a charged-back attendee indistinguishable from a
    -- stranger, and the remedy for "unknown" is to issue a free ticket.
    ('11111111-0000-4000-8000-000000000005', 'Edsger', 'Dijkstra', 'edsger@example.com',
     'Eindhoven', null, 'standard', 'standard', 'early_bird', 'refunded',
     39000, 'CHF', 'cus_seed_005', 'cs_seed_005', null, null, null, null, null, null, null),

    -- VIP with a door note: exercises the VIP badge and the note banner.
    ('11111111-0000-4000-8000-000000000006', 'Margaret', 'Hamilton', 'margaret@example.com',
     'NASA', 'Director of Software Engineering', 'vip', 'vip', 'blind_bird', 'confirmed',
     89000, 'CHF', 'cus_seed_006', 'cs_seed_006',
     null, null, null, null, 'Speaking at 10:00 — send straight to the green room', null, null),

    -- TRANSFERRED. The badge names someone else, which is exactly when a
    -- volunteer needs the provenance banner. Regression cover for the roster
    -- projection having omitted transferred_from_* entirely.
    ('11111111-0000-4000-8000-000000000007', 'Tim', 'Berners-Lee', 'tim@example.com',
     'CERN', null, 'standard', 'standard', 'late_bird', 'confirmed',
     49000, 'CHF', 'cus_seed_007', 'cs_seed_007',
     null, null, null, null, null, 'Vint Cerf', 'vint@example.com')
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Apparel sizes
-- ─────────────────────────────────────────────────────────────────────────────
-- Deliberately NOT every ticket: Dijkstra and Berners-Lee have none, so the
-- panel's "no size on file" path is covered too.

insert into public.ticket_apparel_preferences (ticket_id, tshirt_size, hoodie_size)
values
    ('11111111-0000-4000-8000-000000000001', 'L', 'M'),
    ('11111111-0000-4000-8000-000000000002', 'M', null),
    ('11111111-0000-4000-8000-000000000003', 'XL', 'XL'),
    ('11111111-0000-4000-8000-000000000004', 'S', 'M'),
    ('11111111-0000-4000-8000-000000000006', 'M', 'M')
on conflict (ticket_id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- A workshop to hang the seats on
-- ─────────────────────────────────────────────────────────────────────────────
-- Created only if the catalogue is empty. This overlay has to be SELF-SUFFICIENT:
-- a Supabase branch may be seeded without the CFP/commerce base seed, and an
-- overlay that quietly inserted no seats because it found no workshop would look
-- like it had worked while leaving the workshop-day flow untestable.

insert into public.workshops (
    id, title, description, room, date, start_time, end_time,
    capacity, price, currency, status
)
select
    '33333333-0000-4000-8000-000000000001', 'Testing Effectively',
    'Seeded workshop for door check-in testing.',
    'Room 1', '2026-09-10', '09:00:00', '12:00:00',
    20, 25000, 'CHF', 'published'
where not exists (select 1 from public.workshops);

-- ─────────────────────────────────────────────────────────────────────────────
-- Workshop seats
-- ─────────────────────────────────────────────────────────────────────────────
-- Attached to whichever workshop is first in the catalogue, so this works
-- against the base seed's workshop as well as the one created just above.

with target as (
    select id from public.workshops order by start_time nulls last, id limit 1
)
insert into public.workshop_registrations (
    id, workshop_id, ticket_id, first_name, last_name, email, company,
    seat_index, status, amount_paid, currency, stripe_session_id,
    checked_in, checked_in_at
)
select * from (
    -- Ada's own seat, bought on her own ticket and naming her. Resolves as
    -- matched_by = own_email.
    select '22222222-0000-4000-8000-000000000001'::uuid, (select id from target),
           '11111111-0000-4000-8000-000000000001'::uuid,
           'Ada', 'Lovelace', 'ada@example.com', 'Analytical Engines',
           0, 'confirmed'::public.payment_status, 25000, 'CHF', 'cs_seed_ws_001',
           false, null::timestamptz
    union all
    -- A COLLEAGUE'S seat stamped with Ada's ticket_id, because
    -- findTicketIdForSession puts one ticket id on every seat of a Stripe
    -- session. This is the case that makes seat attribution subtle: it must show
    -- on Ada's panel as "purchased for someone else", and resolve to Alonzo when
    -- his own seat QR is scanned. He has NO conference ticket.
    select '22222222-0000-4000-8000-000000000002'::uuid, (select id from target),
           '11111111-0000-4000-8000-000000000001'::uuid,
           'Alonzo', 'Church', 'alonzo@example.com', 'Princeton',
           1, 'confirmed'::public.payment_status, 25000, 'CHF', 'cs_seed_ws_001',
           false, null
    union all
    -- An UNNAMED seat on Ada's ticket: nobody was ever entered. Attributed to
    -- the purchaser (matched_by = own_ticket) because it names nobody else, and
    -- at the desk it is findable only by company.
    select '22222222-0000-4000-8000-000000000003'::uuid, (select id from target),
           '11111111-0000-4000-8000-000000000001'::uuid,
           null, null, null, 'Analytical Engines',
           2, 'confirmed'::public.payment_status, 25000, 'CHF', 'cs_seed_ws_001',
           false, null
    union all
    -- A workshop-only attendee with no ticket at all and an accented name, so
    -- the diacritic folding in the desk search has something real to find.
    -- Already checked in for the workshop day.
    select '22222222-0000-4000-8000-000000000004'::uuid, (select id from target),
           null::uuid,
           'Jürgen', 'Müller', 'juergen@example.com', 'Ergon',
           3, 'confirmed'::public.payment_status, 25000, 'CHF', 'cs_seed_ws_002',
           -- BOTH the flag and the timestamp. door_check_in's conditional UPDATE
           -- keys on `checked_in IS NOT TRUE` and door_dashboard counts the flag,
           -- so a timestamp without the flag is a half-state that reads as
           -- "arrived" on the panel and "not arrived" on the dashboard.
           true, '2026-09-10T08:31:00Z'::timestamptz
) as seats
on conflict (id) do nothing;

commit;
