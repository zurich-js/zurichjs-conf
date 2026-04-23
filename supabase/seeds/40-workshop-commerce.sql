-- Workshop commerce seed overlay.
-- The default local seed already includes the full schedule, a draft workshop
-- offering, and confirmed workshop registrations. This overlay keeps invited
-- speakers intact and clears Stripe wiring fields so local commerce remains
-- ready to test without any live pricing connection details.

begin;

-- Keep invited speakers intact while ensuring CFP-managed speakers reflect the
-- accepted lineup used by later admin flows.
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
    ),
    is_featured = false,
    updated_at = now()
where exists (
    select 1
    from public.cfp_submissions submission
    where submission.speaker_id = speaker.id
)
or exists (
    select 1
    from public.cfp_submission_speakers participant
    where participant.speaker_id = speaker.id
);

update public.workshops
set
    session_id = session.id,
    stripe_product_id = null,
    stripe_price_lookup_key = null,
    metadata = coalesce(workshops.metadata, '{}'::jsonb) || '{"seed_phase": "workshop-commerce"}'::jsonb
from public.program_sessions session
where workshops.cfp_submission_id = session.cfp_submission_id;

update public.program_sessions
set
    metadata = coalesce(metadata, '{}'::jsonb) || '{"seed_phase": "workshop-commerce"}'::jsonb,
    updated_at = now()
where status <> 'archived';

update public.workshop_registrations
set metadata = coalesce(metadata, '{}'::jsonb) || '{"seed_phase": "workshop-commerce"}'::jsonb;

commit;
