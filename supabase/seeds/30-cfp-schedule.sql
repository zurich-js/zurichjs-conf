-- CFP schedule seed overlay.
-- Start from supabase/seed-local-cfp.sql, then normalize the database to the
-- scheduling phase: a mostly-complete schedule exists, some accepted sessions
-- and workshops are placed, open slots remain, and workshop commerce is still
-- absent. Invited/admin-managed speakers remain available without sessions so
-- scheduling flows can still attach new items in this phase.

begin;

delete from public.workshop_registrations;
delete from public.workshops;
delete from public.checkout_cart_snapshots;

delete from public.program_schedule_items
where type = 'session'
  and id not in (
    'd2000000-0000-4000-8000-000000000001', -- workshop
    'd2000000-0000-4000-8000-000000000003', -- panel
    'd3000000-0000-4000-8000-000000000009'  -- talk
  );

update public.program_schedule_items item
set session_id = session.id
from public.program_sessions session
where item.submission_id = session.cfp_submission_id;

update public.program_sessions session
set
    status = 'confirmed',
    metadata = coalesce(session.metadata, '{}'::jsonb) || '{"seed_phase": "cfp-schedule"}'::jsonb,
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
    metadata = coalesce(metadata, '{}'::jsonb) || '{"seed_phase": "cfp-schedule"}'::jsonb,
    updated_at = now();

-- Keep invited speakers untouched, but normalize CFP-linked speakers so the
-- phase reflects an accepted speaker lineup before all schedule slots are filled.
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

update public.cfp_submissions submission
set
    scheduled_date = item.date,
    scheduled_start_time = item.start_time,
    scheduled_duration_minutes = item.duration_minutes,
    room = item.room,
    updated_at = now()
from public.program_schedule_items item
where item.submission_id = submission.id;

commit;
