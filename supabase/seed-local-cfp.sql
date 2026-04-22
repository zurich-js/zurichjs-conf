-- Local CFP seed data
-- Applied automatically by `supabase db reset` for local development.
-- Covers reviewer-dashboard testing plus a small public speakers lineup.

-- Reviewers
insert into public.cfp_reviewers (
    id,
    email,
    name,
    role,
    invited_by,
    invited_at,
    accepted_at,
    is_active
)
values
    (
        'e58748da-c000-43b7-a2bc-528b7c6763db',
        'anonymous-review@zurichjs.test',
        'Anonymous Review',
        'reviewer',
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T08:00:00.000Z',
        true
    ),
    (
        'e58748da-a000-43b7-a2bc-528b7c6763db',
        'admin-review@zurichjs.test',
        'Admin Review',
        'super_admin',
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T08:05:00.000Z',
        true
    ),
    (
        '6b111111-1111-4111-8111-111111111111',
        'member-review@zurichjs.test',
        'Member Review',
        'committee_member',
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T09:00:00.000Z',
        true
    ),
    (
        '6b222222-2222-4222-8222-222222222222',
        'reviewer2+local@zurichjs.test',
        'Reviewer Two',
        'committee_member',
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
        null,
        '2026-02-26T00:00:00.000Z',
        '2026-02-26T13:45:00.000Z',
        true
    )
on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    role = excluded.role,
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
    portrait_foreground_url,
    portrait_background_url,
    speaker_role,
    is_visible,
    is_featured,
    is_admin_managed
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
        '/images/meetups/nico.jpg',
        '/images/meetups/cloudflare.png',
        'speaker',
        true,
        true,
        false
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
        '/images/meetups/jens.png',
        '/images/meetups/june-workshop.png',
        'speaker',
        true,
        true,
        false
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
        null,
        '/images/meetups/july-group.png',
        'speaker',
        true,
        false,
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
        null,
        null,
        'speaker',
        true,
        false,
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
        '/images/meetups/bogdan.png',
        null,
        'speaker',
        true,
        false,
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
        null,
        '/images/meetups/june.png',
        'speaker',
        true,
        false,
        false
    ),
    (
        '77777777-7777-4777-8777-777777777777',
        'rina.mc@example.test',
        'Rina',
        'Host',
        'Conference MC',
        'ZurichJS',
        'Rina keeps the conference day moving, introduces speakers, and helps make the room feel welcoming.',
        '/images/team/nadja.png',
        '/images/meetups/july-group.png',
        null,
        '/images/meetups/july-group.png',
        'mc',
        true,
        false,
        true
    ),
    -- Invited speakers (no CFP submissions). Emulate admin-curated lineup additions
    -- (keynotes, featured guests, and non-featured invited speakers).
    (
        '99999999-1111-4999-8999-111111111111',
        'priya.keynote@example.test',
        'Priya',
        'Desai',
        'Keynote Speaker',
        'Runtime Collective',
        'Priya is an invited keynote speaker who leads platform engineering across distributed JavaScript runtimes and speaks about the next decade of the web.',
        '/images/meetups/ginetta.png',
        '/images/meetups/cloudflare.png',
        '/images/meetups/ginetta.png',
        '/images/meetups/cloudflare.png',
        'speaker',
        true,
        true,
        true
    ),
    (
        '99999999-2222-4999-8999-222222222222',
        'theo.invited@example.test',
        'Theo',
        'Blanc',
        'Principal Architect',
        'Edge Runtime Labs',
        'Theo is an invited featured speaker known for deep-dive sessions on browser internals, rendering pipelines, and low-level web performance.',
        '/images/meetups/jens.png',
        '/images/meetups/may.png',
        '/images/meetups/jens.png',
        '/images/meetups/may.png',
        'speaker',
        true,
        true,
        true
    ),
    (
        '99999999-3333-4999-8999-333333333333',
        'yuki.invited@example.test',
        'Yuki',
        'Tanaka',
        'Staff Engineer',
        'Pattern Works',
        'Yuki is an invited featured speaker who explores the boundary between design systems, component APIs, and accessible product engineering.',
        '/images/team/nadja.png',
        '/images/meetups/june.png',
        '/images/team/nadja.png',
        '/images/meetups/june.png',
        'speaker',
        true,
        true,
        true
    ),
    (
        '99999999-4444-4999-8999-444444444444',
        'dominik.invited@example.test',
        'Dominik',
        'Fischer',
        'Senior Engineer',
        'Helvetic Build',
        'Dominik is an invited guest speaker joining the program without a CFP submission to share lessons learned from running large Swiss engineering teams.',
        '/images/meetups/bogdan.png',
        null,
        '/images/meetups/bogdan.png',
        null,
        'speaker',
        true,
        false,
        true
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
    portrait_foreground_url = excluded.portrait_foreground_url,
    portrait_background_url = excluded.portrait_background_url,
    speaker_role = excluded.speaker_role,
    is_visible = excluded.is_visible,
    is_featured = excluded.is_featured,
    is_admin_managed = excluded.is_admin_managed;

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
    submitted_at,
    created_at,
    updated_at
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
        '2026-02-20T10:00:00.000Z',
        '2026-02-19T14:00:00.000Z',
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
        '2026-02-21T10:00:00.000Z',
        '2026-02-20T15:30:00.000Z',
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
        '2026-02-22T10:00:00.000Z',
        '2026-02-21T16:45:00.000Z',
        '2026-02-22T10:00:00.000Z'
    ),
    (
        'aaaa7777-7777-4777-8777-777777777777',
        '11111111-1111-4111-8111-111111111111',
        'The Future of JavaScript Communities',
        'A panel discussion about how JavaScript communities evolve, how conferences should support new speakers, and how local meetups can create long-term belonging.',
        'panel',
        'intermediate',
        null,
        '2026-09-11',
        '12:25:00',
        25,
        'Auditorium',
        'accepted',
        '2026-02-22T12:00:00.000Z',
        '2026-02-21T17:30:00.000Z',
        '2026-02-22T12:00:00.000Z'
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
        '2026-02-23T10:00:00.000Z',
        '2026-02-22T09:15:00.000Z',
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
        '2026-02-24T10:00:00.000Z',
        '2026-02-23T13:20:00.000Z',
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
        '2026-02-25T10:00:00.000Z',
        '2026-02-24T18:40:00.000Z',
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
        '2026-02-26T10:00:00.000Z',
        '2026-02-25T11:10:00.000Z',
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
        '2026-02-27T10:00:00.000Z',
        '2026-02-26T19:05:00.000Z',
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
        '2026-02-28T10:00:00.000Z',
        '2026-02-27T08:50:00.000Z',
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
        '2026-03-01T10:00:00.000Z',
        '2026-02-28T12:35:00.000Z',
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
    submitted_at = excluded.submitted_at,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;

insert into public.cfp_submission_speakers (
    submission_id,
    speaker_id,
    role
)
values
    (
        'aaaa7777-7777-4777-8777-777777777777',
        '33333333-3333-4333-8333-333333333333',
        'panelist'
    )
on conflict (submission_id, speaker_id) do update set
    role = excluded.role;

-- Program sessions are the post-selection source of truth. CFP submissions
-- remain intake/review records; accepted/scheduled/sellable submissions are
-- promoted here so schedule and commerce rows can link to program entities.
insert into public.program_sessions (
    cfp_submission_id,
    kind,
    title,
    abstract,
    level,
    status,
    workshop_duration_minutes,
    workshop_capacity,
    metadata
)
select
    submission.id,
    case
        when submission.submission_type = 'workshop' then 'workshop'::public.program_session_kind
        when submission.submission_type = 'panel' then 'panel'::public.program_session_kind
        else 'talk'::public.program_session_kind
    end,
    submission.title,
    submission.abstract,
    submission.talk_level,
    'confirmed'::public.program_session_status,
    case
        when submission.workshop_duration_hours is not null then submission.workshop_duration_hours * 60
        else submission.scheduled_duration_minutes
    end,
    submission.workshop_max_participants,
    jsonb_build_object(
        'seeded', true,
        'source', 'seed-local-cfp',
        'legacy_submission_type', submission.submission_type
    )
from public.cfp_submissions submission
where submission.status = 'accepted'
   or submission.scheduled_date is not null
on conflict (cfp_submission_id) where cfp_submission_id is not null do update set
    kind = excluded.kind,
    title = excluded.title,
    abstract = excluded.abstract,
    level = excluded.level,
    status = excluded.status,
    workshop_duration_minutes = excluded.workshop_duration_minutes,
    workshop_capacity = excluded.workshop_capacity,
    metadata = excluded.metadata,
    updated_at = now();

insert into public.program_session_speakers (
    session_id,
    speaker_id,
    role,
    sort_order
)
select
    session.id,
    submission.speaker_id,
    case
        when session.kind = 'workshop' then 'instructor'::public.program_session_speaker_role
        else 'speaker'::public.program_session_speaker_role
    end,
    0
from public.program_sessions session
join public.cfp_submissions submission on submission.id = session.cfp_submission_id
on conflict (session_id, speaker_id) do update set
    role = excluded.role,
    sort_order = excluded.sort_order;

insert into public.program_session_speakers (
    session_id,
    speaker_id,
    role,
    sort_order
)
select
    session.id,
    participant.speaker_id,
    case
        when participant.role in ('host', 'mc', 'instructor') then participant.role::public.program_session_speaker_role
        when session.kind = 'workshop' then 'instructor'::public.program_session_speaker_role
        else 'panelist'::public.program_session_speaker_role
    end,
    (row_number() over (partition by session.id order by participant.speaker_id))::integer
from public.program_sessions session
join public.cfp_submission_speakers participant on participant.submission_id = session.cfp_submission_id
on conflict (session_id, speaker_id) do update set
    role = excluded.role,
    sort_order = excluded.sort_order;

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
        'session',
        'The Future of JavaScript Communities',
        'Panel slot',
        'aaaa7777-7777-4777-8777-777777777777',
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

update public.program_schedule_items item
set session_id = session.id
from public.program_sessions session
where item.submission_id = session.cfp_submission_id;

-- Workshop commerce overlays and local purchase fixtures
insert into public.workshops (
    id,
    title,
    description,
    cfp_submission_id,
    date,
    start_time,
    end_time,
    capacity,
    price,
    currency,
    status,
    room,
    duration_minutes,
    stripe_product_id,
    stripe_price_lookup_key,
    metadata,
    created_at,
    updated_at
)
values
    (
        'eeee2222-2222-4222-8222-222222222222',
        'Shipping Nuxt 4 in Production',
        'Patterns for SSR, caching, and deployment hardening in Nuxt 4 apps, with notes on when plain Nuxt defaults stop being enough.',
        'aaaa2222-2222-4222-8222-222222222222',
        '2026-09-10',
        '09:00:00',
        '13:00:00',
        24,
        9900,
        'CHF',
        'draft',
        'Technopark',
        240,
        null,
        'workshop_shipping-nuxt-4-production',
        '{"seeded": true, "note": "Draft local fixture; validate Stripe before publishing."}'::jsonb,
        '2026-04-20T10:00:00.000Z',
        '2026-04-20T10:00:00.000Z'
    )
on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    cfp_submission_id = excluded.cfp_submission_id,
    date = excluded.date,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    capacity = excluded.capacity,
    price = excluded.price,
    currency = excluded.currency,
    status = excluded.status,
    room = excluded.room,
    duration_minutes = excluded.duration_minutes,
    stripe_product_id = excluded.stripe_product_id,
    stripe_price_lookup_key = excluded.stripe_price_lookup_key,
    metadata = excluded.metadata,
    updated_at = excluded.updated_at;

update public.workshops workshop
set session_id = session.id
from public.program_sessions session
where workshop.cfp_submission_id = session.cfp_submission_id;

insert into public.workshop_registrations (
    id,
    workshop_id,
    user_id,
    ticket_id,
    stripe_session_id,
    stripe_payment_intent_id,
    amount_paid,
    currency,
    status,
    first_name,
    last_name,
    email,
    discount_amount,
    seat_index,
    metadata,
    created_at,
    updated_at
)
values
    (
        'eeee9000-0000-4000-8000-000000000001',
        'eeee2222-2222-4222-8222-222222222222',
        null,
        null,
        'cs_test_seed_workshop_nuxt_multi',
        null,
        9900,
        'CHF',
        'confirmed',
        'Local',
        'Buyer',
        'local.buyer@example.test',
        0,
        0,
        '{"seeded": true}'::jsonb,
        '2026-04-21T09:00:00.000Z',
        '2026-04-21T09:00:00.000Z'
    ),
    (
        'eeee9000-0000-4000-8000-000000000002',
        'eeee2222-2222-4222-8222-222222222222',
        null,
        null,
        'cs_test_seed_workshop_nuxt_multi',
        null,
        8900,
        'CHF',
        'confirmed',
        'Second',
        'Buyer',
        'second.buyer@example.test',
        1000,
        1,
        '{"seeded": true}'::jsonb,
        '2026-04-21T09:01:00.000Z',
        '2026-04-21T09:01:00.000Z'
    )
on conflict (id) do update set
    amount_paid = excluded.amount_paid,
    currency = excluded.currency,
    status = excluded.status,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email,
    discount_amount = excluded.discount_amount,
    seat_index = excluded.seat_index,
    metadata = excluded.metadata,
    updated_at = excluded.updated_at;

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
        ('aaaa7777-7777-4777-8777-777777777777', 'Architecture'),
        ('aaaa7777-7777-4777-8777-777777777777', 'DX'),
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
        4, 4, 4, 4, 4,
        'Committee review: relevant and timely.',
        null,
        '2026-03-02T15:00:00.000Z',
        '2026-03-02T15:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000006',
        'aaaa4444-4444-4444-8444-444444444444',
        '6b111111-1111-4111-8111-111111111111',
        4, 4, 4, 4, 4,
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
        4, 4, 4, 4, 4,
        'Great fit for advanced backend/frontend crossover audience.',
        null,
        '2026-03-04T11:00:00.000Z',
        '2026-03-04T11:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000009',
        'aaaa1111-1111-4111-8111-111111111111',
        '6b222222-2222-4222-8222-222222222222',
        4, 4, 4, 4, 4,
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
        4, 4, 4, 4, 4,
        'Would work well for the main track.',
        null,
        '2026-03-04T13:00:00.000Z',
        '2026-03-04T13:00:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000012',
        'aaaa1111-1111-4111-8111-111111111111',
        '6b555555-5555-4555-8555-555555555555',
        4, 4, 4, 4, 4,
        'Practical and current topic.',
        null,
        '2026-03-04T13:30:00.000Z',
        '2026-03-04T13:30:00.000Z'
    ),
    (
        '70000000-0000-4000-8000-000000000013',
        'aaaa1111-1111-4111-8111-111111111111',
        '6b666666-6666-4666-8666-666666666666',
        4, 4, 4, 4, 4,
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
        4, 4, 4, 4, 4,
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
        4, 4, 4, 4, 4,
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
        4, 4, 4, 4, 3,
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
        4, 4, 4, 4, 4,
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
        4, 4, 4, 4, 4,
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
    created_at = excluded.created_at,
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
    created_at,
    updated_at,
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
    now() - make_interval(days => (series % 45) + 1, hours => (series * 3) % 24, mins => (series * 11) % 60) as created_at,
    now() - make_interval(days => series % 45, hours => series % 12) as updated_at,
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
    created_at = excluded.created_at,
    updated_at = excluded.updated_at,
    metadata = excluded.metadata;

insert into public.program_sessions (
    cfp_submission_id,
    kind,
    title,
    abstract,
    level,
    status,
    workshop_duration_minutes,
    workshop_capacity,
    metadata
)
select
    submission.id,
    case
        when submission.submission_type = 'workshop' then 'workshop'::public.program_session_kind
        when submission.submission_type = 'panel' then 'panel'::public.program_session_kind
        else 'talk'::public.program_session_kind
    end,
    submission.title,
    submission.abstract,
    submission.talk_level,
    'confirmed'::public.program_session_status,
    case
        when submission.workshop_duration_hours is not null then submission.workshop_duration_hours * 60
        else submission.scheduled_duration_minutes
    end,
    submission.workshop_max_participants,
    jsonb_build_object(
        'seeded', true,
        'source', 'seed-local-cfp-generated',
        'legacy_submission_type', submission.submission_type
    )
from public.cfp_submissions submission
where submission.status = 'accepted'
   or submission.scheduled_date is not null
on conflict (cfp_submission_id) where cfp_submission_id is not null do update set
    kind = excluded.kind,
    title = excluded.title,
    abstract = excluded.abstract,
    level = excluded.level,
    status = excluded.status,
    workshop_duration_minutes = excluded.workshop_duration_minutes,
    workshop_capacity = excluded.workshop_capacity,
    metadata = excluded.metadata,
    updated_at = now();

insert into public.program_session_speakers (
    session_id,
    speaker_id,
    role,
    sort_order
)
select
    session.id,
    submission.speaker_id,
    case
        when session.kind = 'workshop' then 'instructor'::public.program_session_speaker_role
        else 'speaker'::public.program_session_speaker_role
    end,
    0
from public.program_sessions session
join public.cfp_submissions submission on submission.id = session.cfp_submission_id
on conflict (session_id, speaker_id) do update set
    role = excluded.role,
    sort_order = excluded.sort_order;

insert into public.program_session_speakers (
    session_id,
    speaker_id,
    role,
    sort_order
)
select
    session.id,
    participant.speaker_id,
    case
        when participant.role in ('host', 'mc', 'instructor') then participant.role::public.program_session_speaker_role
        when session.kind = 'workshop' then 'instructor'::public.program_session_speaker_role
        else 'panelist'::public.program_session_speaker_role
    end,
    (row_number() over (partition by session.id order by participant.speaker_id))::integer
from public.program_sessions session
join public.cfp_submission_speakers participant on participant.submission_id = session.cfp_submission_id
on conflict (session_id, speaker_id) do update set
    role = excluded.role,
    sort_order = excluded.sort_order;

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
        submission_series,
        reviewer_sort,
        now()
            - make_interval(
                days => least((submission_series % 45), ((submission_series * 7 + reviewer_sort * 3) % 30)),
                hours => ((submission_series + reviewer_sort * 5) % 12),
                mins => ((submission_series * reviewer_sort) % 60)
            ) as reviewed_at
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
    feedback_to_speaker,
    created_at,
    updated_at
)
select
    ('84000000-0000-4000-8000-' || lpad(row_id::text, 12, '0'))::uuid as id,
    submission_id,
    reviewer_id,
    seeded_scores.score_overall,
    seeded_scores.score_relevance,
    seeded_scores.score_technical_depth,
    seeded_scores.score_clarity,
    seeded_scores.score_diversity,
    case
        -- High-volume reviewers with sparse internal notes.
        when reviewer_sort = 1 and submission_series % 20 = 0
            then ('Sparse internal note for high-volume reviewer on submission ' || submission_series::text)
        when reviewer_sort = 2 and submission_series % 12 = 0
            then ('Occasional internal note from high-volume reviewer on submission ' || submission_series::text)
        -- Lower-volume reviewers with consistent written notes.
        when reviewer_sort >= 15 and submission_series % 2 = 0
            then ('Detailed internal note from thoughtful reviewer on submission ' || submission_series::text)
        -- Flat scorers still leave occasional notes, so their spread penalty is visible.
        when reviewer_sort in (9, 10) and submission_series % 5 = 0
            then ('Flat-score reviewer note for submission ' || submission_series::text)
        -- Mid-pack reviewers write notes sometimes.
        when reviewer_sort between 3 and 8 and (submission_series + reviewer_sort) % 3 = 0
            then ('Seeded private note for submission ' || submission_series::text)
        else null
    end as private_notes,
    case
        -- High-volume reviewers rarely write speaker-facing feedback.
        when reviewer_sort = 1 and submission_series % 30 = 0
            then ('Short speaker feedback from high-volume reviewer for submission ' || submission_series::text)
        when reviewer_sort = 2 and submission_series % 18 = 0
            then ('Short speaker feedback from high-volume reviewer for submission ' || submission_series::text)
        -- Lower-volume reviewers write speaker-facing feedback frequently.
        when reviewer_sort >= 15
            then ('Detailed speaker feedback from thoughtful reviewer for submission ' || submission_series::text)
        -- Mid-pack reviewers write speaker-facing feedback occasionally.
        when reviewer_sort between 3 and 8 and submission_series % 4 = 0
            then ('Seeded speaker feedback for submission ' || submission_series::text)
        else null
    end as feedback_to_speaker,
    reviewed_at as created_at,
    reviewed_at as updated_at
from generated_reviews
cross join lateral (
    select case
        -- High-volume reviewers have enough volume, but not always enough score variation.
        when reviewer_sort = 1 then case when submission_series % 4 in (0, 1) then 3 else 4 end
        when reviewer_sort = 2 then case when submission_series % 5 in (0, 1) then 2 else 3 end
        -- Mid-volume reviewers use a moderate spread.
        when reviewer_sort between 3 and 5 then case
            when submission_series % 6 in (0, 1) then 2
            when submission_series % 6 in (2, 3) then 3
            else 4
        end
        when reviewer_sort between 6 and 8 then case when submission_series % 3 = 0 then 2 else 3 end
        -- Deliberately flat reviewers demonstrate the rating-spread penalty.
        when reviewer_sort = 9 then 4
        when reviewer_sort = 10 then 1
        -- Later reviewers have fewer reviews and a healthier but not maximal spread.
        when reviewer_sort between 11 and 14 then case
            when submission_series % 4 = 0 then 1
            when submission_series % 4 in (1, 2) then 2
            else 3
        end
        when reviewer_sort >= 15 then case
            when submission_series % 5 in (0, 1) then 2
            when submission_series % 5 in (2, 3) then 3
            else 4
        end
        when ((submission_series * 17 + reviewer_sort * 11) % 20) < 2 then 1
        when ((submission_series * 17 + reviewer_sort * 11) % 20) < 7 then 2
        when ((submission_series * 17 + reviewer_sort * 11) % 20) < 15 then 3
        else 4
    end as score_overall
) as base_score
cross join lateral (
    select
        base_score.score_overall,
        greatest(1, least(4, base_score.score_overall + case when (submission_series + reviewer_sort) % 6 = 0 then -1 when (submission_series + reviewer_sort) % 7 = 0 then 1 else 0 end)) as score_relevance,
        greatest(1, least(4, base_score.score_overall + case when (submission_series + reviewer_sort * 2) % 5 = 0 then -1 when (submission_series + reviewer_sort * 2) % 11 = 0 then 1 else 0 end)) as score_technical_depth,
        greatest(1, least(4, base_score.score_overall + case when (submission_series * 2 + reviewer_sort) % 7 = 0 then -1 when (submission_series * 2 + reviewer_sort) % 13 = 0 then 1 else 0 end)) as score_clarity,
        greatest(1, least(4, base_score.score_overall + case when (submission_series + reviewer_sort * 3) % 8 = 0 then -1 when (submission_series + reviewer_sort * 3) % 17 = 0 then 1 else 0 end)) as score_diversity
) as seeded_scores
on conflict (submission_id, reviewer_id) do update set
    score_overall = excluded.score_overall,
    score_relevance = excluded.score_relevance,
    score_technical_depth = excluded.score_technical_depth,
    score_clarity = excluded.score_clarity,
    score_diversity = excluded.score_diversity,
    private_notes = excluded.private_notes,
    feedback_to_speaker = excluded.feedback_to_speaker,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;
