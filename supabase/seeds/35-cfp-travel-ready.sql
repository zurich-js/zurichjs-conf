-- CFP travel-ready seed overlay.
-- Start from supabase/seed-local-cfp.sql, apply the schedule overlay first,
-- then add realistic travel confirmations, transportation legs, and
-- reimbursement requests so admin travel operations can be tested end-to-end.

begin;

delete from public.workshop_registrations;
delete from public.workshops;
delete from public.checkout_cart_snapshots;

delete from public.cfp_speaker_reimbursements;
delete from public.cfp_speaker_flights;
delete from public.cfp_speaker_accommodation;
delete from public.cfp_speaker_travel;

update public.program_sessions
set
    metadata = coalesce(metadata, '{}'::jsonb) || '{"seed_phase": "cfp-travel-ready"}'::jsonb,
    updated_at = now()
where status <> 'archived';

update public.cfp_submissions
set
    metadata = coalesce(metadata, '{}'::jsonb) || '{"seed_phase": "cfp-travel-ready"}'::jsonb,
    updated_at = now()
where status in ('accepted', 'waitlisted', 'submitted', 'rejected');

-- Keep invited speakers intact and make sure CFP speakers with accepted content
-- remain on the managed list for travel operations.
update public.cfp_speakers speaker
set
    is_admin_managed = (
        exists (
            select 1
            from public.cfp_submissions submission
            where submission.speaker_id = speaker.id
              and submission.status = 'accepted'
        )
        or exists (
            select 1
            from public.cfp_submission_speakers participant
            join public.cfp_submissions submission on submission.id = participant.submission_id
            where participant.speaker_id = speaker.id
              and submission.status = 'accepted'
        )
        or speaker.is_admin_managed
    ),
    is_visible = (
        exists (
            select 1
            from public.cfp_submissions submission
            where submission.speaker_id = speaker.id
              and submission.status = 'accepted'
        )
        or exists (
            select 1
            from public.cfp_submission_speakers participant
            join public.cfp_submissions submission on submission.id = participant.submission_id
            where participant.speaker_id = speaker.id
              and submission.status = 'accepted'
        )
        or speaker.is_visible
    ),
    updated_at = now()
where speaker.id in (
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    '55555555-5555-4555-8555-555555555555',
    '99999999-1111-4999-8999-111111111111',
    '99999999-2222-4999-8999-222222222222',
    '99999999-3333-4999-8999-333333333333',
    '99999999-4444-4999-8999-444444444444'
);

insert into public.cfp_speaker_travel (
    speaker_id,
    arrival_date,
    departure_date,
    attending_speakers_dinner,
    attending_speakers_activities,
    dietary_restrictions,
    accessibility_needs,
    flight_budget_amount,
    flight_budget_currency,
    travel_confirmed,
    confirmed_at,
    metadata
)
values
    (
        '11111111-1111-4111-8111-111111111111',
        current_date,
        current_date + 1,
        true,
        true,
        null,
        null,
        35000,
        'CHF',
        true,
        now() - interval '2 days',
        jsonb_build_object('seed_phase', 'cfp-travel-ready', 'attending_after_party', true, 'attending_post_conf', false)
    ),
    (
        '22222222-2222-4222-8222-222222222222',
        current_date,
        current_date + 2,
        true,
        true,
        'Vegetarian',
        null,
        42000,
        'CHF',
        true,
        now() - interval '2 days',
        jsonb_build_object('seed_phase', 'cfp-travel-ready', 'attending_after_party', true, 'attending_post_conf', true)
    ),
    (
        '33333333-3333-4333-8333-333333333333',
        current_date + 1,
        current_date + 2,
        false,
        false,
        null,
        null,
        28000,
        'CHF',
        false,
        null,
        jsonb_build_object('seed_phase', 'cfp-travel-ready', 'attending_after_party', false, 'attending_post_conf', true)
    ),
    (
        '55555555-5555-4555-8555-555555555555',
        current_date,
        current_date,
        true,
        false,
        null,
        null,
        22000,
        'CHF',
        true,
        now() - interval '1 day',
        jsonb_build_object('seed_phase', 'cfp-travel-ready', 'attending_after_party', false, 'attending_post_conf', false)
    ),
    (
        '99999999-1111-4999-8999-111111111111',
        current_date - 1,
        current_date + 1,
        true,
        true,
        null,
        null,
        60000,
        'CHF',
        true,
        now() - interval '3 days',
        jsonb_build_object('seed_phase', 'cfp-travel-ready', 'attending_after_party', true, 'attending_post_conf', true)
    ),
    (
        '99999999-2222-4999-8999-222222222222',
        current_date,
        current_date + 3,
        true,
        true,
        null,
        null,
        50000,
        'CHF',
        true,
        now() - interval '2 days',
        jsonb_build_object('seed_phase', 'cfp-travel-ready', 'attending_after_party', true, 'attending_post_conf', true)
    ),
    (
        '99999999-3333-4999-8999-333333333333',
        current_date + 2,
        current_date + 4,
        false,
        true,
        'No dairy',
        null,
        45000,
        'CHF',
        false,
        null,
        jsonb_build_object('seed_phase', 'cfp-travel-ready', 'attending_after_party', true, 'attending_post_conf', false)
    ),
    (
        '99999999-4444-4999-8999-444444444444',
        current_date,
        current_date,
        true,
        false,
        null,
        null,
        null,
        'CHF',
        false,
        null,
        jsonb_build_object('seed_phase', 'cfp-travel-ready', 'attending_after_party', false, 'attending_post_conf', false)
    )
on conflict (speaker_id) do update set
    arrival_date = excluded.arrival_date,
    departure_date = excluded.departure_date,
    attending_speakers_dinner = excluded.attending_speakers_dinner,
    attending_speakers_activities = excluded.attending_speakers_activities,
    dietary_restrictions = excluded.dietary_restrictions,
    accessibility_needs = excluded.accessibility_needs,
    flight_budget_amount = excluded.flight_budget_amount,
    flight_budget_currency = excluded.flight_budget_currency,
    travel_confirmed = excluded.travel_confirmed,
    confirmed_at = excluded.confirmed_at,
    metadata = excluded.metadata,
    updated_at = now();

insert into public.cfp_speaker_flights (
    speaker_id,
    direction,
    transport_mode,
    transport_status,
    provider,
    reference_code,
    departure_label,
    arrival_label,
    departure_time,
    arrival_time,
    transport_link_url,
    admin_notes,
    airline,
    flight_number,
    departure_airport,
    arrival_airport,
    booking_reference,
    flight_status,
    tracking_url,
    last_status_update,
    cost_amount,
    cost_currency,
    metadata
)
values
    (
        '11111111-1111-4111-8111-111111111111',
        'inbound',
        'flight',
        'scheduled',
        'Swiss',
        'LX1889',
        'LHR',
        'ZRH',
        now() + interval '1 hour 5 minutes',
        now() + interval '2 hours 55 minutes',
        'https://www.flightaware.com/live/flight/SWR1889',
        'Morning arrival for speaker check-in.',
        'Swiss',
        'LX1889',
        'LHR',
        'ZRH',
        'ALX1889',
        'confirmed',
        'https://www.flightaware.com/live/flight/SWR1889',
        now() - interval '3 hours',
        18500,
        'CHF',
        '{"seed_phase":"cfp-travel-ready"}'::jsonb
    ),
    (
        '11111111-1111-4111-8111-111111111111',
        'outbound',
        'flight',
        'scheduled',
        'Swiss',
        'LX1890',
        'ZRH',
        'LHR',
        now() + interval '1 day 4 hours',
        now() + interval '1 day 5 hours 45 minutes',
        'https://www.flightaware.com/live/flight/SWR1890',
        'Leaves after the after-party wrap-up.',
        'Swiss',
        'LX1890',
        'ZRH',
        'LHR',
        'ALX1890',
        'confirmed',
        'https://www.flightaware.com/live/flight/SWR1890',
        now() - interval '2 hours',
        17600,
        'CHF',
        '{"seed_phase":"cfp-travel-ready"}'::jsonb
    ),
    (
        '22222222-2222-4222-8222-222222222222',
        'inbound',
        'train',
        'scheduled',
        'SBB',
        'IC 5',
        'Basel SBB',
        'Zurich HB',
        now() + interval '3 hours 10 minutes',
        now() + interval '4 hours 6 minutes',
        'https://www.sbb.ch/en',
        'Train arrival from Basel on conference morning.',
        null,
        null,
        null,
        null,
        null,
        'confirmed',
        'https://www.sbb.ch/en',
        now() - interval '4 hours',
        5400,
        'CHF',
        '{"seed_phase":"cfp-travel-ready"}'::jsonb
    ),
    (
        '22222222-2222-4222-8222-222222222222',
        'outbound',
        'train',
        'scheduled',
        'SBB',
        'IR 37',
        'Zurich HB',
        'Basel SBB',
        now() + interval '2 days 1 hour',
        now() + interval '2 days 1 hour 56 minutes',
        'https://www.sbb.ch/en',
        'Return train after workshop debrief.',
        null,
        null,
        null,
        null,
        null,
        'confirmed',
        'https://www.sbb.ch/en',
        now() - interval '4 hours',
        5400,
        'CHF',
        '{"seed_phase":"cfp-travel-ready"}'::jsonb
    ),
    (
        '33333333-3333-4333-8333-333333333333',
        'inbound',
        'link_only',
        'delayed',
        'DB / SBB',
        'Itinerary shared in mail',
        'Berlin',
        'Zurich',
        now() + interval '1 day 2 hours',
        now() + interval '1 day 6 hours 45 minutes',
        'https://www.google.com/search?q=Berlin+Zurich+train',
        'Speaker still comparing train options.',
        null,
        null,
        null,
        null,
        null,
        'delayed',
        'https://www.google.com/search?q=Berlin+Zurich+train',
        now() - interval '1 hour',
        null,
        'CHF',
        '{"seed_phase":"cfp-travel-ready"}'::jsonb
    ),
    (
        '55555555-5555-4555-8555-555555555555',
        'outbound',
        'flight',
        'complete',
        'Swiss',
        'LX2801',
        'ZRH',
        'OPO',
        now() - interval '3 hours 20 minutes',
        now() - interval '1 hour 25 minutes',
        'https://www.flightaware.com/live/flight/SWR2801',
        'Already boarded and left this morning.',
        'Swiss',
        'LX2801',
        'ZRH',
        'OPO',
        'NIN2801',
        'departed',
        'https://www.flightaware.com/live/flight/SWR2801',
        now() - interval '30 minutes',
        14300,
        'CHF',
        '{"seed_phase":"cfp-travel-ready"}'::jsonb
    ),
    (
        '99999999-1111-4999-8999-111111111111',
        'inbound',
        'flight',
        'complete',
        'British Airways',
        'BA712',
        'LHR',
        'ZRH',
        now() - interval '1 day 6 hours',
        now() - interval '1 day 3 hours 25 minutes',
        'https://www.flightaware.com/live/flight/BAW712',
        'Keynote speaker already onsite.',
        'British Airways',
        'BA712',
        'LHR',
        'ZRH',
        'PRI712',
        'arrived',
        'https://www.flightaware.com/live/flight/BAW712',
        now() - interval '1 day',
        33400,
        'CHF',
        '{"seed_phase":"cfp-travel-ready"}'::jsonb
    ),
    (
        '99999999-1111-4999-8999-111111111111',
        'outbound',
        'flight',
        'scheduled',
        'British Airways',
        'BA713',
        'ZRH',
        'LHR',
        now() + interval '7 hours',
        now() + interval '8 hours 40 minutes',
        'https://www.flightaware.com/live/flight/BAW713',
        'Departure after keynote dinner.',
        'British Airways',
        'BA713',
        'ZRH',
        'LHR',
        'PRI713',
        'confirmed',
        'https://www.flightaware.com/live/flight/BAW713',
        now() - interval '2 hours',
        34800,
        'CHF',
        '{"seed_phase":"cfp-travel-ready"}'::jsonb
    ),
    (
        '99999999-2222-4999-8999-222222222222',
        'inbound',
        'flight',
        'delayed',
        'Lufthansa',
        'LH5748',
        'MUC',
        'ZRH',
        now() + interval '1 hour 35 minutes',
        now() + interval '2 hours 30 minutes',
        'https://www.flightaware.com/live/flight/DLH5748',
        'Delayed connection, watch closely.',
        'Lufthansa',
        'LH5748',
        'MUC',
        'ZRH',
        'THE5748',
        'delayed',
        'https://www.flightaware.com/live/flight/DLH5748',
        now() - interval '20 minutes',
        12200,
        'CHF',
        '{"seed_phase":"cfp-travel-ready"}'::jsonb
    ),
    (
        '99999999-2222-4999-8999-222222222222',
        'outbound',
        'flight',
        'scheduled',
        'Lufthansa',
        'LH5749',
        'ZRH',
        'MUC',
        now() + interval '3 days 2 hours',
        now() + interval '3 days 2 hours 50 minutes',
        'https://www.flightaware.com/live/flight/DLH5749',
        'Evening return to Munich.',
        'Lufthansa',
        'LH5749',
        'ZRH',
        'MUC',
        'THE5749',
        'confirmed',
        'https://www.flightaware.com/live/flight/DLH5749',
        now() - interval '20 minutes',
        12100,
        'CHF',
        '{"seed_phase":"cfp-travel-ready"}'::jsonb
    ),
    (
        '99999999-4444-4999-8999-444444444444',
        'inbound',
        'none',
        'scheduled',
        null,
        null,
        'Zurich local',
        'Venue',
        null,
        null,
        null,
        'Local speaker, no conference transport needed.',
        null,
        null,
        null,
        null,
        null,
        'confirmed',
        null,
        now(),
        null,
        'CHF',
        '{"seed_phase":"cfp-travel-ready"}'::jsonb
    )
on conflict (speaker_id, direction) do update set
    transport_mode = excluded.transport_mode,
    transport_status = excluded.transport_status,
    provider = excluded.provider,
    reference_code = excluded.reference_code,
    departure_label = excluded.departure_label,
    arrival_label = excluded.arrival_label,
    departure_time = excluded.departure_time,
    arrival_time = excluded.arrival_time,
    transport_link_url = excluded.transport_link_url,
    admin_notes = excluded.admin_notes,
    airline = excluded.airline,
    flight_number = excluded.flight_number,
    departure_airport = excluded.departure_airport,
    arrival_airport = excluded.arrival_airport,
    booking_reference = excluded.booking_reference,
    flight_status = excluded.flight_status,
    tracking_url = excluded.tracking_url,
    last_status_update = excluded.last_status_update,
    cost_amount = excluded.cost_amount,
    cost_currency = excluded.cost_currency,
    metadata = excluded.metadata,
    updated_at = now();

insert into public.cfp_speaker_reimbursements (
    id,
    speaker_id,
    expense_type,
    description,
    amount,
    currency,
    receipt_url,
    bank_name,
    bank_account_holder,
    iban,
    swift_bic,
    status,
    reviewed_at,
    paid_at,
    admin_notes,
    metadata,
    created_at,
    updated_at
)
values
    (
        'f1111111-1111-4111-8111-111111111111',
        '11111111-1111-4111-8111-111111111111',
        'flight',
        'Inbound flight reimbursement',
        18500,
        'CHF',
        'https://example.test/receipts/alex-flight.pdf',
        'ZKB',
        'Alex Ng',
        'CH9300762011623852957',
        'ZKBKCHZZ80A',
        'pending',
        null,
        null,
        'Waiting for finance review.',
        '{"seed_phase":"cfp-travel-ready"}'::jsonb,
        now() - interval '2 days',
        now() - interval '2 days'
    ),
    (
        'f2222222-2222-4222-8222-222222222222',
        '22222222-2222-4222-8222-222222222222',
        'transport',
        'Train tickets Basel to Zurich return',
        10800,
        'CHF',
        'https://example.test/receipts/sam-train.pdf',
        'UBS',
        'Sam Rivera',
        'CH5604835012345678009',
        'UBSWCHZH80A',
        'approved',
        now() - interval '1 day',
        null,
        'Approved, payout queued.',
        '{"seed_phase":"cfp-travel-ready"}'::jsonb,
        now() - interval '3 days',
        now() - interval '1 day'
    ),
    (
        'f3333333-3333-4333-8333-333333333333',
        '99999999-1111-4999-8999-111111111111',
        'accommodation',
        'Hotel invoice for keynote stay',
        52000,
        'CHF',
        'https://example.test/receipts/priya-hotel.pdf',
        'Credit Suisse',
        'Priya Desai',
        'CH9300762011623852958',
        'CRESCHZZ80A',
        'paid',
        now() - interval '4 days',
        now() - interval '2 days',
        'Paid after keynote contract confirmation.',
        '{"seed_phase":"cfp-travel-ready"}'::jsonb,
        now() - interval '6 days',
        now() - interval '2 days'
    ),
    (
        'f4444444-4444-4444-8444-444444444444',
        '99999999-2222-4999-8999-222222222222',
        'flight',
        'Delayed inbound connection change fee',
        7600,
        'CHF',
        'https://example.test/receipts/theo-change-fee.pdf',
        'PostFinance',
        'Theo Blanc',
        'CH9309000000800076453',
        'POFICHBEXXX',
        'pending',
        null,
        null,
        'Keep pending so overview shows multiple requests.',
        '{"seed_phase":"cfp-travel-ready"}'::jsonb,
        now() - interval '12 hours',
        now() - interval '12 hours'
    )
on conflict (id) do update set
    speaker_id = excluded.speaker_id,
    expense_type = excluded.expense_type,
    description = excluded.description,
    amount = excluded.amount,
    currency = excluded.currency,
    receipt_url = excluded.receipt_url,
    bank_name = excluded.bank_name,
    bank_account_holder = excluded.bank_account_holder,
    iban = excluded.iban,
    swift_bic = excluded.swift_bic,
    status = excluded.status,
    reviewed_at = excluded.reviewed_at,
    paid_at = excluded.paid_at,
    admin_notes = excluded.admin_notes,
    metadata = excluded.metadata,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;

commit;
