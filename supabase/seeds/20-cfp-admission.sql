-- CFP admission seed overlay.
-- Start from supabase/seed-local-cfp.sql, then normalize the database to the
-- admission phase: decisions and selected CFP speakers exist, but no schedule
-- or workshop commerce has been created yet. Invited/admin-managed speakers
-- remain visible without any submissions or sessions attached.

begin;

delete from public.workshop_registrations;
delete from public.workshops;
delete from public.checkout_cart_snapshots;
delete from public.program_schedule_items;

delete from public.program_sessions session
where session.cfp_submission_id is not null
  and not exists (
      select 1
      from public.cfp_submissions submission
      where submission.id = session.cfp_submission_id
        and submission.status = 'accepted'
  );

update public.program_sessions session
set
    status = 'confirmed',
    metadata = coalesce(session.metadata, '{}'::jsonb) || '{"seed_phase": "cfp-admission"}'::jsonb,
    updated_at = now()
from public.cfp_submissions submission
where session.cfp_submission_id = submission.id
  and submission.status = 'accepted';

update public.cfp_submissions
set
    scheduled_date = null,
    scheduled_start_time = null,
    scheduled_duration_minutes = null,
    room = null,
    metadata = coalesce(metadata, '{}'::jsonb) || '{"seed_phase": "cfp-admission"}'::jsonb,
    updated_at = now();

-- Only normalize CFP-linked speakers. Invited speakers keep their curated
-- featured/non-featured lineup state even though they have no submissions.
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

commit;
