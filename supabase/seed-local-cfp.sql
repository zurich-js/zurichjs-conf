-- Local CFP seed data
-- Applied automatically by `supabase db reset` for local development.
-- Covers reviewer-dashboard testing plus a small public speakers lineup.

-- Reviewers
insert into public.cfp_reviewers (
    id,
    email,
    name,
    role,
    can_see_speaker_identity,
    invited_by,
    invited_at,
    accepted_at,
    is_active
)
values
    (
        'e58748da-c000-43b7-a2bc-528b7c6763db',
        'reviewer+local@zurichjs.test',
        'Local Reviewer',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T08:00:00.000Z',
        true
    ),
    (
        '6b111111-1111-4111-8111-111111111111',
        'committee+local@zurichjs.test',
        'Committee Reviewer',
        'reviewer',
        true,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T09:00:00.000Z',
        true
    ),
    (
        '6b222222-2222-4222-8222-222222222222',
        'reviewer2+local@zurichjs.test',
        'Reviewer Two',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T09:15:00.000Z',
        true
    ),
    (
        '6b333333-3333-4333-8333-333333333333',
        'reviewer3+local@zurichjs.test',
        'Reviewer Three',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T09:30:00.000Z',
        true
    ),
    (
        '6b444444-4444-4444-8444-444444444444',
        'reviewer4+local@zurichjs.test',
        'Reviewer Four',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T09:45:00.000Z',
        true
    ),
    (
        '6b555555-5555-4555-8555-555555555555',
        'reviewer5+local@zurichjs.test',
        'Reviewer Five',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T10:00:00.000Z',
        true
    ),
    (
        '6b666666-6666-4666-8666-666666666666',
        'reviewer6+local@zurichjs.test',
        'Reviewer Six',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T10:15:00.000Z',
        true
    ),
    (
        '6b777777-7777-4777-8777-777777777777',
        'reviewer7+local@zurichjs.test',
        'Reviewer Seven',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T10:30:00.000Z',
        true
    ),
    (
        '6b888888-8888-4888-8888-888888888888',
        'reviewer8+local@zurichjs.test',
        'Reviewer Eight',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T10:45:00.000Z',
        true
    ),
    (
        '6b999999-9999-4999-8999-999999999999',
        'reviewer9+local@zurichjs.test',
        'Reviewer Nine',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T11:00:00.000Z',
        true
    ),
    (
        '6baaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'reviewer10+local@zurichjs.test',
        'Reviewer Ten',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T11:15:00.000Z',
        true
    ),
    (
        '6bb11111-1111-4111-8111-111111111111',
        'reviewer11+local@zurichjs.test',
        'Reviewer Eleven',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T11:30:00.000Z',
        true
    ),
    (
        '6bb22222-2222-4222-8222-222222222222',
        'reviewer12+local@zurichjs.test',
        'Reviewer Twelve',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T11:45:00.000Z',
        true
    ),
    (
        '6bb33333-3333-4333-8333-333333333333',
        'reviewer13+local@zurichjs.test',
        'Reviewer Thirteen',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T12:00:00.000Z',
        true
    ),
    (
        '6bb44444-4444-4444-8444-444444444444',
        'reviewer14+local@zurichjs.test',
        'Reviewer Fourteen',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T12:15:00.000Z',
        true
    ),
    (
        '6bb55555-5555-4555-8555-555555555555',
        'reviewer15+local@zurichjs.test',
        'Reviewer Fifteen',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T12:30:00.000Z',
        true
    ),
    (
        '6bb66666-6666-4666-8666-666666666666',
        'reviewer16+local@zurichjs.test',
        'Reviewer Sixteen',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T12:45:00.000Z',
        true
    ),
    (
        '6bb77777-7777-4777-8777-777777777777',
        'reviewer17+local@zurichjs.test',
        'Reviewer Seventeen',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T13:00:00.000Z',
        true
    ),
    (
        '6bb88888-8888-4888-8888-888888888888',
        'reviewer18+local@zurichjs.test',
        'Reviewer Eighteen',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T13:15:00.000Z',
        true
    ),
    (
        '6bb99999-9999-4999-8999-999999999999',
        'reviewer19+local@zurichjs.test',
        'Reviewer Nineteen',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T13:30:00.000Z',
        true
    ),
    (
        '6bcccccc-cccc-4ccc-8ccc-cccccccccccc',
        'reviewer20+local@zurichjs.test',
        'Reviewer Twenty',
        'reviewer',
        false,
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T13:45:00.000Z',
        true
    )
on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    role = excluded.role,
    can_see_speaker_identity = excluded.can_see_speaker_identity,
    invited_at = excluded.invited_at,
    accepted_at = excluded.accepted_at,
    is_active = excluded.is_active;

-- Speakers
insert into public.cfp_speakers (
    id,
    email,
    first_name,
    last_name,
    job_title,
    company,
    bio,
    profile_image_url,
    header_image_url,
    is_visible,
    is_featured
)
values
    (
        '11111111-1111-4111-8111-111111111111',
        'alex.ai@example.test',
        'Alex',
        'Ng',
        'Engineer',
        'Example Labs',
        'Alex builds AI tooling for JavaScript teams and likes talks that stay grounded in production reality.',
        '/images/meetups/nico.jpg',
        '/images/meetups/cloudflare.png',
        true,
        true
    ),
    (
        '22222222-2222-4222-8222-222222222222',
        'sam.nuxt@example.test',
        'Sam',
        'Rivera',
        'Frontend Lead',
        'Nuxt Forge',
        'Sam helps product teams ship large frontend apps and enjoys sharing practical lessons from framework adoption.',
        '/images/meetups/jens.png',
        '/images/meetups/june-workshop.png',
        true,
        true
    ),
    (
        '33333333-3333-4333-8333-333333333333',
        'maya.web@example.test',
        'Maya',
        'Khan',
        'Developer Advocate',
        'Vue Forge',
        'Maya works with growing frontend teams on architecture, migration strategy, and developer experience.',
        '/images/meetups/ginetta.png',
        '/images/meetups/july-group.png',
        true,
        false
    ),
    (
        '44444444-4444-4444-8444-444444444444',
        'leo.misc@example.test',
        'Leo',
        'Berg',
        'Staff Engineer',
        'State Systems',
        'Leo likes modeling hard product problems with clear system boundaries and resilient client-side patterns.',
        null,
        null,
        true,
        false
    ),
    (
        '55555555-5555-4555-8555-555555555555',
        'nina.scale@example.test',
        'Nina',
        'Costa',
        'Platform Engineer',
        'Typed Systems',
        'Nina focuses on refactors, contracts, and helping teams move fast without losing confidence.',
        '/images/meetups/bogdan.png',
        '/images/meetups/may.png',
        true,
        false
    ),
    (
        '66666666-6666-4666-8666-666666666666',
        'omar.cache@example.test',
        'Omar',
        'Haddad',
        'Principal Engineer',
        'Edge Cache Co',
        'Omar spends most of his time on caching, performance, and the messy details between browser and edge.',
        null,
        '/images/meetups/june.png',
        true,
        false
    )
on conflict (id) do update set
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    job_title = excluded.job_title,
    company = excluded.company,
    bio = excluded.bio,
    profile_image_url = excluded.profile_image_url,
    header_image_url = excluded.header_image_url,
    is_visible = excluded.is_visible,
    is_featured = excluded.is_featured;

-- Tags
insert into public.cfp_tags (
    id,
    name,
    is_suggested
)
values
    ('90000000-0000-4000-8000-000000000001', 'AI', true),
    ('90000000-0000-4000-8000-000000000002', 'Agents', true),
    ('90000000-0000-4000-8000-000000000003', 'Nuxt', true),
    ('90000000-0000-4000-8000-000000000004', 'Nuxt 4', true),
    ('90000000-0000-4000-8000-000000000005', 'Vue', true),
    ('90000000-0000-4000-8000-000000000006', 'Architecture', true),
    ('90000000-0000-4000-8000-000000000007', 'Observability', true),
    ('90000000-0000-4000-8000-000000000008', 'Performance', true),
    ('90000000-0000-4000-8000-000000000009', 'Caching', true),
    ('90000000-0000-4000-8000-000000000010', 'Testing', true),
    ('90000000-0000-4000-8000-000000000011', 'DX', true),
    ('90000000-0000-4000-8000-000000000012', 'TypeScript', true)
on conflict (name) do update set
    is_suggested = excluded.is_suggested;

-- Submissions
insert into public.cfp_submissions (
    id,
    speaker_id,
    title,
    abstract,
    submission_type,
    talk_level,
    workshop_duration_hours,
    scheduled_date,
    scheduled_start_time,
    scheduled_duration_minutes,
    room,
    status,
    submitted_at
)
values
    (
        'aaaa1111-1111-4111-8111-111111111111',
        '11111111-1111-4111-8111-111111111111',
        'Practical AI Agents in JavaScript',
        'Build robust agent workflows with guardrails, evals, and telemetry. Covers tool calling, retries, and production debugging for AI agents.',
        'lightning',
        'intermediate',
        null,
        '2026-09-11',
        '10:55:00',
        45,
        'Auditorium',
        'accepted',
        '2026-02-20T10:00:00.000Z'
    ),
    (
        'aaaa2222-2222-4222-8222-222222222222',
        '22222222-2222-4222-8222-222222222222',
        'Shipping Nuxt 4 in Production',
        'Patterns for SSR, caching, and deployment hardening in Nuxt 4 apps, with notes on when plain Nuxt defaults stop being enough.',
        'workshop',
        'advanced',
        4,
        '2026-09-10',
        '09:00:00',
        240,
        'Technopark',
        'accepted',
        '2026-02-21T10:00:00.000Z'
    ),
    (
        'aaaa3333-3333-4333-8333-333333333333',
        '33333333-3333-4333-8333-333333333333',
        'Nuxt Patterns for Vue Teams',
        'A migration playbook for Vue teams adopting modern Nuxt architecture, composables, and layered code ownership.',
        'workshop',
        'beginner',
        4,
        '2026-09-10',
        '09:00:00',
        240,
        'Technopark',
        'accepted',
        '2026-02-22T10:00:00.000Z'
    ),
    (
        'aaaa4444-4444-4444-8444-444444444444',
        '44444444-4444-4444-8444-444444444444',
        'Event Sourcing for Frontend Apps',
        'State modeling techniques with snapshots, replay, and conflict resolution for collaborative clients and offline-first UX.',
        'standard',
        'advanced',
        null,
        null,
        null,
        null,
        null,
        'submitted',
        '2026-02-23T10:00:00.000Z'
    ),
    (
        'bbbb1111-1111-4111-8111-111111111111',
        '55555555-5555-4555-8555-555555555555',
        'Legacy Refactors without AI',
        'Tactical refactoring methods that do not rely on AI assistance: seams, strangler patterns, and confidence-building tests.',
        'lightning',
        'intermediate',
        null,
        null,
        null,
        null,
        null,
        'submitted',
        '2026-02-24T10:00:00.000Z'
    ),
    (
        'bbbb2222-2222-4222-8222-222222222222',
        '33333333-3333-4333-8333-333333333333',
        'Observability for AI Workloads',
        'Tracing, metrics, cost controls, and failure analysis for LLM-heavy systems with humans still in the loop.',
        'standard',
        'advanced',
        null,
        null,
        null,
        null,
        null,
        'waitlisted',
        '2026-02-25T10:00:00.000Z'
    ),
    (
        'bbbb3333-3333-4333-8333-333333333333',
        '22222222-2222-4222-8222-222222222222',
        'Vue DX in 2026',
        'Nuxt 4 module ergonomics, layer composition, and test setup for fast-moving product teams.',
        'standard',
        'intermediate',
        null,
        null,
        null,
        null,
        null,
        'submitted',
        '2026-02-26T10:00:00.000Z'
    ),
    (
        'bbbb4444-4444-4444-8444-444444444444',
        '66666666-6666-4666-8666-666666666666',
        'HTTP Caching Deep Dive',
        'ETag, Cache-Control, CDN invalidation, stale-while-revalidate, and edge caching strategies you can actually trust.',
        'workshop',
        'intermediate',
        4,
        null,
        null,
        null,
        null,
        'submitted',
        '2026-02-27T10:00:00.000Z'
    ),
    (
        'cccc1111-1111-4111-8111-111111111111',
        '55555555-5555-4555-8555-555555555555',
        'Type-Safe MCP Servers with TypeScript',
        'Design contracts, schema validation, and reliable tool execution for MCP servers in TypeScript.',
        'standard',
        'advanced',
        null,
        '2026-09-11',
        '14:05:00',
        30,
        'Auditorium',
        'accepted',
        '2026-02-28T10:00:00.000Z'
    ),
    (
        'cccc2222-2222-4222-8222-222222222222',
        '66666666-6666-4666-8666-666666666666',
        'Testing Nuxt 4 Without Tears',
        'A practical stack for component, integration, and end-to-end testing in Nuxt 4, including CI stability tips.',
        'lightning',
        'beginner',
        null,
        null,
        null,
        null,
        null,
        'rejected',
        '2026-03-01T10:00:00.000Z'
    )
on conflict (id) do update set
    speaker_id = excluded.speaker_id,
    title = excluded.title,
    abstract = excluded.abstract,
    submission_type = excluded.submission_type,
    talk_level = excluded.talk_level,
    workshop_duration_hours = excluded.workshop_duration_hours,
    scheduled_date = excluded.scheduled_date,
    scheduled_start_time = excluded.scheduled_start_time,
    scheduled_duration_minutes = excluded.scheduled_duration_minutes,
    room = excluded.room,
    status = excluded.status,
    submitted_at = excluded.submitted_at;

insert into public.program_schedule_items (
    id,
    date,
    start_time,
    duration_minutes,
    room,
    type,
    title,
    description,
    submission_id,
    is_visible
)
values
    (
        'd1000000-0000-4000-8000-000000000001',
        '2026-09-09',
        '17:00:00',
        300,
        null,
        'event',
        'ZurichJS Special Edition Warm-up Meetup',
        'Kick off the conference week with a relaxed community evening for local and visiting JavaScript developers.',
        null,
        true
    ),
    (
        'd2000000-0000-4000-8000-000000000001',
        '2026-09-10',
        '09:00:00',
        240,
        'Technopark',
        'session',
        'Shipping Nuxt 4 in Production',
        'Workshop slot',
        'aaaa2222-2222-4222-8222-222222222222',
        true
    ),
    (
        'd2000000-0000-4000-8000-000000000002',
        '2026-09-10',
        '09:00:00',
        240,
        'Technopark',
        'session',
        'Nuxt Patterns for Vue Teams',
        'Workshop slot',
        'aaaa3333-3333-4333-8333-333333333333',
        true
    ),
    (
        'd2000000-0000-4000-8000-000000000003',
        '2026-09-10',
        '09:00:00',
        240,
        null,
        'placeholder',
        'TBA',
        null,
        null,
        true
    ),
    (
        'd2000000-0000-4000-8000-000000000004',
        '2026-09-10',
        '13:00:00',
        60,
        null,
        'break',
        'Lunch break',
        'Time to reset, grab food, and meet other attendees before the afternoon workshop block starts.',
        null,
        true
    ),
    (
        'd2000000-0000-4000-8000-000000000005',
        '2026-09-10',
        '14:00:00',
        240,
        null,
        'placeholder',
        'TBA',
        null,
        null,
        true
    ),
    (
        'd2000000-0000-4000-8000-000000000006',
        '2026-09-10',
        '14:00:00',
        240,
        null,
        'placeholder',
        'TBA',
        null,
        null,
        true
    ),
    (
        'd2000000-0000-4000-8000-000000000007',
        '2026-09-10',
        '14:00:00',
        240,
        null,
        'placeholder',
        'TBA',
        null,
        null,
        true
    ),
    (
        'd2000000-0000-4000-8000-000000000008',
        '2026-09-10',
        '19:00:00',
        180,
        null,
        'event',
        'Speakers Dinner',
        'An exclusive dinner for speakers to connect before the main conference day.',
        null,
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000001',
        '2026-09-11',
        '08:00:00',
        45,
        null,
        'event',
        'Doors open, registration, coffee, sponsors',
        'Arrive early, get settled, grab coffee, and spend time with the sponsors before the main program starts.',
        null,
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000002',
        '2026-09-11',
        '08:45:00',
        15,
        null,
        'event',
        'Opening remarks',
        'Opening remarks to kick off the conference day.',
        null,
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000003',
        '2026-09-11',
        '09:00:00',
        30,
        null,
        'placeholder',
        'TBA',
        null,
        null,
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000005',
        '2026-09-11',
        '09:35:00',
        30,
        null,
        'placeholder',
        'TBA',
        null,
        null,
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000007',
        '2026-09-11',
        '10:10:00',
        30,
        null,
        'placeholder',
        'TBA',
        null,
        null,
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000008',
        '2026-09-11',
        '10:40:00',
        15,
        null,
        'break',
        'Break',
        'Take a break, recharge, and say hi to the people around you.',
        null,
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000009',
        '2026-09-11',
        '10:55:00',
        45,
        'Auditorium',
        'session',
        'Practical AI Agents in JavaScript',
        'Talk slot',
        'aaaa1111-1111-4111-8111-111111111111',
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000011',
        '2026-09-11',
        '11:45:00',
        30,
        null,
        'placeholder',
        'TBA',
        null,
        null,
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000012',
        '2026-09-11',
        '12:15:00',
        10,
        null,
        'break',
        'Lunch transition, food pickup',
        'Pick up food, get settled, and get ready for the midday program.',
        null,
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000013',
        '2026-09-11',
        '12:25:00',
        25,
        null,
        'placeholder',
        'TBA',
        null,
        null,
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000015',
        '2026-09-11',
        '12:55:00',
        25,
        null,
        'placeholder',
        'TBA',
        null,
        null,
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000016',
        '2026-09-11',
        '13:20:00',
        45,
        null,
        'break',
        'Networking, sponsor time, hallway track',
        'Take time to connect, chat with sponsors, and follow the hallway track.',
        null,
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000017',
        '2026-09-11',
        '14:05:00',
        30,
        'Auditorium',
        'session',
        'Type-Safe MCP Servers with TypeScript',
        'Talk slot',
        'cccc1111-1111-4111-8111-111111111111',
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000019',
        '2026-09-11',
        '14:40:00',
        30,
        null,
        'placeholder',
        'TBA',
        null,
        null,
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000021',
        '2026-09-11',
        '15:15:00',
        45,
        null,
        'placeholder',
        'TBA',
        null,
        null,
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000023',
        '2026-09-11',
        '16:05:00',
        30,
        null,
        'placeholder',
        'TBA',
        null,
        null,
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000025',
        '2026-09-11',
        '16:40:00',
        30,
        null,
        'placeholder',
        'TBA',
        null,
        null,
        true
    ),
    (
        'd3000000-0000-4000-8000-000000000026',
        '2026-09-11',
        '17:10:00',
        50,
        null,
        'event',
        'Closing remarks, thank-yous, drinks & networking',
        'Wrap up the conference day and stay around for drinks and networking.',
        null,
        true
    ),
    (
        'd4000000-0000-4000-8000-000000000001',
        '2026-09-12',
        '10:00:00',
        300,
        null,
        'event',
        'Speaker activities',
        'Exclusive post-conference activities for VIP ticket holders and speakers.',
        null,
        true
    )
on conflict (id) do update set
    date = excluded.date,
    start_time = excluded.start_time,
    duration_minutes = excluded.duration_minutes,
    room = excluded.room,
    type = excluded.type,
    title = excluded.title,
    description = excluded.description,
    submission_id = excluded.submission_id,
    is_visible = excluded.is_visible;

-- Submission/tag links
insert into public.cfp_submission_tags (
    submission_id,
    tag_id
)
select links.submission_id::uuid, tags.id
from (
    values
        ('aaaa1111-1111-4111-8111-111111111111', 'AI'),
        ('aaaa1111-1111-4111-8111-111111111111', 'Agents'),
        ('aaaa1111-1111-4111-8111-111111111111', 'TypeScript'),
        ('aaaa2222-2222-4222-8222-222222222222', 'Nuxt'),
        ('aaaa2222-2222-4222-8222-222222222222', 'Nuxt 4'),
        ('aaaa2222-2222-4222-8222-222222222222', 'Performance'),
        ('aaaa2222-2222-4222-8222-222222222222', 'Caching'),
        ('aaaa3333-3333-4333-8333-333333333333', 'Nuxt'),
        ('aaaa3333-3333-4333-8333-333333333333', 'Vue'),
        ('aaaa3333-3333-4333-8333-333333333333', 'DX'),
        ('aaaa4444-4444-4444-8444-444444444444', 'Architecture'),
        ('aaaa4444-4444-4444-8444-444444444444', 'TypeScript'),
        ('bbbb1111-1111-4111-8111-111111111111', 'Architecture'),
        ('bbbb1111-1111-4111-8111-111111111111', 'Testing'),
        ('bbbb2222-2222-4222-8222-222222222222', 'AI'),
        ('bbbb2222-2222-4222-8222-222222222222', 'Observability'),
        ('bbbb2222-2222-4222-8222-222222222222', 'Agents'),
        ('bbbb3333-3333-4333-8333-333333333333', 'Nuxt'),
        ('bbbb3333-3333-4333-8333-333333333333', 'Nuxt 4'),
        ('bbbb3333-3333-4333-8333-333333333333', 'Vue'),
        ('bbbb3333-3333-4333-8333-333333333333', 'DX'),
        ('bbbb4444-4444-4444-8444-444444444444', 'Caching'),
        ('bbbb4444-4444-4444-8444-444444444444', 'Performance'),
        ('cccc1111-1111-4111-8111-111111111111', 'TypeScript'),
        ('cccc1111-1111-4111-8111-111111111111', 'Architecture'),
        ('cccc1111-1111-4111-8111-111111111111', 'Agents'),
        ('cccc2222-2222-4222-8222-222222222222', 'Nuxt'),
        ('cccc2222-2222-4222-8222-222222222222', 'Nuxt 4'),
        ('cccc2222-2222-4222-8222-222222222222', 'Testing')
) as links(submission_id, tag_name)
join public.cfp_tags tags on tags.name = links.tag_name
on conflict (submission_id, tag_id) do nothing;

-- Reviews
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
    feedback_to_speaker,
    created_at,
    updated_at
)
values
    (
        '70000000-0000-4000-8000-000000000001',
        'aaaa1111-1111-4111-8111-111111111111',
        'e58748da-c000-43b7-a2bc-528b7c6763db',
        4, 4, 4, 4, 4,
        'Strong framing and practical examples.',
        null,
        '2026-03-02T10:00:00.000Z',
        '2026-03-02T10:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000002',
        'aaaa2222-2222-4222-8222-222222222222',
        'e58748da-c000-43b7-a2bc-528b7c6763db',
        3, 4, 3, 3, 3,
        'Good topic, could use clearer production tradeoffs.',
        null,
        '2026-03-02T11:00:00.000Z',
        '2026-03-02T11:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000003',
        'bbbb2222-2222-4222-8222-222222222222',
        'e58748da-c000-43b7-a2bc-528b7c6763db',
        4, 4, 4, 3, 4,
        'Strong operational angle for AI systems.',
        null,
        '2026-03-03T09:30:00.000Z',
        '2026-03-03T09:30:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000004',
        'cccc2222-2222-4222-8222-222222222222',
        'e58748da-c000-43b7-a2bc-528b7c6763db',
        2, 3, 2, 3, 2,
        'Useful for beginners but may overlap with other Nuxt talks.',
        null,
        '2026-03-03T12:00:00.000Z',
        '2026-03-03T12:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000005',
        'aaaa1111-1111-4111-8111-111111111111',
        '6b111111-1111-4111-8111-111111111111',
        4, 5, 4, 4, 4,
        'Committee review: relevant and timely.',
        null,
        '2026-03-02T15:00:00.000Z',
        '2026-03-02T15:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000006',
        'aaaa4444-4444-4444-8444-444444444444',
        '6b111111-1111-4111-8111-111111111111',
        5, 4, 5, 4, 4,
        'Excellent depth and strong frontend angle.',
        null,
        '2026-03-04T09:00:00.000Z',
        '2026-03-04T09:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000007',
        'bbbb4444-4444-4444-8444-444444444444',
        '6b111111-1111-4111-8111-111111111111',
        4, 4, 4, 4, 3,
        'Workshop looks useful and practical.',
        null,
        '2026-03-04T10:00:00.000Z',
        '2026-03-04T10:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000008',
        'cccc1111-1111-4111-8111-111111111111',
        '6b111111-1111-4111-8111-111111111111',
        5, 5, 5, 4, 4,
        'Great fit for advanced backend/frontend crossover audience.',
        null,
        '2026-03-04T11:00:00.000Z',
        '2026-03-04T11:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000009',
        'aaaa1111-1111-4111-8111-111111111111',
        '6b222222-2222-4222-8222-222222222222',
        5, 4, 5, 4, 4,
        'Very strong premise and easy to program.',
        null,
        '2026-03-04T12:00:00.000Z',
        '2026-03-04T12:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000010',
        'aaaa1111-1111-4111-8111-111111111111',
        '6b333333-3333-4333-8333-333333333333',
        4, 4, 4, 4, 3,
        'Solid examples and good pacing.',
        null,
        '2026-03-04T12:30:00.000Z',
        '2026-03-04T12:30:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000011',
        'aaaa1111-1111-4111-8111-111111111111',
        '6b444444-4444-4444-8444-444444444444',
        4, 5, 4, 4, 4,
        'Would work well for the main track.',
        null,
        '2026-03-04T13:00:00.000Z',
        '2026-03-04T13:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000012',
        'aaaa1111-1111-4111-8111-111111111111',
        '6b555555-5555-4555-8555-555555555555',
        4, 4, 4, 5, 4,
        'Practical and current topic.',
        null,
        '2026-03-04T13:30:00.000Z',
        '2026-03-04T13:30:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000013',
        'aaaa1111-1111-4111-8111-111111111111',
        '6b666666-6666-4666-8666-666666666666',
        5, 5, 4, 4, 4,
        'Helpful production focus.',
        null,
        '2026-03-04T14:00:00.000Z',
        '2026-03-04T14:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000014',
        'aaaa1111-1111-4111-8111-111111111111',
        '6b777777-7777-4777-8777-777777777777',
        4, 4, 4, 3, 4,
        'Good breadth without feeling vague.',
        null,
        '2026-03-04T14:30:00.000Z',
        '2026-03-04T14:30:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000015',
        'aaaa2222-2222-4222-8222-222222222222',
        '6b222222-2222-4222-8222-222222222222',
        4, 4, 4, 3, 3,
        'Good real-world perspective.',
        null,
        '2026-03-05T09:00:00.000Z',
        '2026-03-05T09:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000016',
        'aaaa2222-2222-4222-8222-222222222222',
        '6b333333-3333-4333-8333-333333333333',
        3, 4, 3, 4, 3,
        'Useful but could use sharper examples.',
        null,
        '2026-03-05T09:30:00.000Z',
        '2026-03-05T09:30:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000017',
        'aaaa2222-2222-4222-8222-222222222222',
        '6b444444-4444-4444-8444-444444444444',
        4, 4, 3, 4, 3,
        'Strong deployment angle.',
        null,
        '2026-03-05T10:00:00.000Z',
        '2026-03-05T10:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000018',
        'aaaa2222-2222-4222-8222-222222222222',
        '6b555555-5555-4555-8555-555555555555',
        3, 3, 3, 4, 3,
        'Promising, though a bit broad.',
        null,
        '2026-03-05T10:30:00.000Z',
        '2026-03-05T10:30:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000019',
        'aaaa2222-2222-4222-8222-222222222222',
        '6b666666-6666-4666-8666-666666666666',
        4, 4, 4, 4, 4,
        'Feels ready with a few refinements.',
        null,
        '2026-03-05T11:00:00.000Z',
        '2026-03-05T11:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000020',
        'aaaa3333-3333-4333-8333-333333333333',
        '6b222222-2222-4222-8222-222222222222',
        3, 3, 3, 4, 3,
        'Approachable for newer Nuxt teams.',
        null,
        '2026-03-05T11:30:00.000Z',
        '2026-03-05T11:30:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000021',
        'aaaa3333-3333-4333-8333-333333333333',
        '6b333333-3333-4333-8333-333333333333',
        4, 3, 3, 4, 3,
        'Useful migration framing.',
        null,
        '2026-03-05T12:00:00.000Z',
        '2026-03-05T12:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000022',
        'aaaa3333-3333-4333-8333-333333333333',
        '6b444444-4444-4444-8444-444444444444',
        3, 3, 4, 3, 3,
        'Solid beginner option.',
        null,
        '2026-03-05T12:30:00.000Z',
        '2026-03-05T12:30:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000023',
        'aaaa3333-3333-4333-8333-333333333333',
        '6b555555-5555-4555-8555-555555555555',
        4, 4, 3, 4, 3,
        'Clear value for teams coming from Vue.',
        null,
        '2026-03-05T13:00:00.000Z',
        '2026-03-05T13:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000024',
        'bbbb1111-1111-4111-8111-111111111111',
        '6b222222-2222-4222-8222-222222222222',
        3, 3, 3, 3, 3,
        'Interesting angle, could be tighter.',
        null,
        '2026-03-05T13:30:00.000Z',
        '2026-03-05T13:30:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000025',
        'bbbb2222-2222-4222-8222-222222222222',
        '6b222222-2222-4222-8222-222222222222',
        4, 4, 4, 4, 4,
        'Strong topic with useful ops lessons.',
        null,
        '2026-03-05T14:00:00.000Z',
        '2026-03-05T14:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000026',
        'bbbb2222-2222-4222-8222-222222222222',
        '6b333333-3333-4333-8333-333333333333',
        4, 4, 4, 3, 4,
        'Good observability angle.',
        null,
        '2026-03-05T14:30:00.000Z',
        '2026-03-05T14:30:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000027',
        'bbbb2222-2222-4222-8222-222222222222',
        '6b444444-4444-4444-8444-444444444444',
        3, 4, 3, 3, 3,
        'Good, though maybe crowded topic area.',
        null,
        '2026-03-05T15:00:00.000Z',
        '2026-03-05T15:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000028',
        'bbbb2222-2222-4222-8222-222222222222',
        '6b555555-5555-4555-8555-555555555555',
        4, 5, 4, 4, 4,
        'Well-targeted for the audience.',
        null,
        '2026-03-05T15:30:00.000Z',
        '2026-03-05T15:30:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000029',
        'bbbb3333-3333-4333-8333-333333333333',
        '6b222222-2222-4222-8222-222222222222',
        3, 3, 3, 4, 3,
        'Reasonable DX story.',
        null,
        '2026-03-05T16:00:00.000Z',
        '2026-03-05T16:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000030',
        'bbbb3333-3333-4333-8333-333333333333',
        '6b333333-3333-4333-8333-333333333333',
        4, 4, 3, 4, 3,
        'Likely valuable for product teams.',
        null,
        '2026-03-05T16:30:00.000Z',
        '2026-03-05T16:30:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000031',
        'bbbb3333-3333-4333-8333-333333333333',
        '6b444444-4444-4444-8444-444444444444',
        3, 3, 4, 3, 3,
        'Could be sharpened, but good topic.',
        null,
        '2026-03-05T17:00:00.000Z',
        '2026-03-05T17:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000032',
        'bbbb4444-4444-4444-8444-444444444444',
        '6b222222-2222-4222-8222-222222222222',
        5, 4, 5, 4, 4,
        'High-value workshop topic.',
        null,
        '2026-03-06T09:00:00.000Z',
        '2026-03-06T09:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000033',
        'bbbb4444-4444-4444-8444-444444444444',
        '6b333333-3333-4333-8333-333333333333',
        4, 4, 4, 4, 4,
        'Hands-on and practical.',
        null,
        '2026-03-06T09:30:00.000Z',
        '2026-03-06T09:30:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000034',
        'bbbb4444-4444-4444-8444-444444444444',
        '6b444444-4444-4444-8444-444444444444',
        4, 5, 4, 4, 3,
        'Would fill a useful workshop slot.',
        null,
        '2026-03-06T10:00:00.000Z',
        '2026-03-06T10:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000035',
        'bbbb4444-4444-4444-8444-444444444444',
        '6b555555-5555-4555-8555-555555555555',
        4, 4, 4, 3, 4,
        'Very actionable content.',
        null,
        '2026-03-06T10:30:00.000Z',
        '2026-03-06T10:30:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000036',
        'bbbb4444-4444-4444-8444-444444444444',
        '6b666666-6666-4666-8666-666666666666',
        5, 4, 5, 4, 4,
        'Detailed enough for a workshop.',
        null,
        '2026-03-06T11:00:00.000Z',
        '2026-03-06T11:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000037',
        'bbbb4444-4444-4444-8444-444444444444',
        '6b777777-7777-4777-8777-777777777777',
        4, 4, 4, 4, 3,
        'Well-scoped and useful.',
        null,
        '2026-03-06T11:30:00.000Z',
        '2026-03-06T11:30:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000038',
        'cccc1111-1111-4111-8111-111111111111',
        '6b222222-2222-4222-8222-222222222222',
        5, 5, 4, 4, 4,
        'Very strong TypeScript angle.',
        null,
        '2026-03-06T12:00:00.000Z',
        '2026-03-06T12:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000039',
        'cccc2222-2222-4222-8222-222222222222',
        '6b222222-2222-4222-8222-222222222222',
        3, 3, 3, 4, 3,
        'Nice beginner topic, but crowded space.',
        null,
        '2026-03-06T12:30:00.000Z',
        '2026-03-06T12:30:00.000Z'
    )
on conflict (submission_id, reviewer_id) do update set
    score_overall = excluded.score_overall,
    score_relevance = excluded.score_relevance,
    score_technical_depth = excluded.score_technical_depth,
    score_clarity = excluded.score_clarity,
    score_diversity = excluded.score_diversity,
    private_notes = excluded.private_notes,
    feedback_to_speaker = excluded.feedback_to_speaker,
    updated_at = excluded.updated_at;

-- Additional generated load-test data merged into the main reviewer dashboard seed.
-- This preserves the curated reviewer-dashboard fixtures above while adding enough
-- speakers, submissions, tags, and review joins to exercise filtering and coverage logic at scale.

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
    jsonb_build_object('seed_source', 'reviewer-dashboard-load-test', 'seed_index', series) as metadata
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

-- Extra submission/tag links
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

-- Extra reviews
with reviewer_pool as (
    select *
    from (
        values
            ('e58748da-c000-43b7-a2bc-528b7c6763db'::uuid, 1),
            ('6b111111-1111-4111-8111-111111111111'::uuid, 2),
            ('6b222222-2222-4222-8222-222222222222'::uuid, 3),
            ('6b333333-3333-4333-8333-333333333333'::uuid, 4),
            ('6b444444-4444-4444-8444-444444444444'::uuid, 5),
            ('6b555555-5555-4555-8555-555555555555'::uuid, 6),
            ('6b666666-6666-4666-8666-666666666666'::uuid, 7),
            ('6b777777-7777-4777-8777-777777777777'::uuid, 8),
            ('6b888888-8888-4888-8888-888888888888'::uuid, 9),
            ('6b999999-9999-4999-8999-999999999999'::uuid, 10),
            ('6baaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid, 11),
            ('6bb11111-1111-4111-8111-111111111111'::uuid, 12),
            ('6bb22222-2222-4222-8222-222222222222'::uuid, 13),
            ('6bb33333-3333-4333-8333-333333333333'::uuid, 14),
            ('6bb44444-4444-4444-8444-444444444444'::uuid, 15),
            ('6bb55555-5555-4555-8555-555555555555'::uuid, 16),
            ('6bb66666-6666-4666-8666-666666666666'::uuid, 17),
            ('6bb77777-7777-4777-8777-777777777777'::uuid, 18)
    ) as reviewers(reviewer_id, reviewer_sort)
),
generated_reviews as (
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
        join reviewer_pool on reviewer_pool.reviewer_sort <= (1 + ((series - 1) % 18))
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
