-- CFP first-stage review seed overlay.
-- Start from supabase/seed-local-cfp.sql, then normalize the database to the
-- review phase: many submissions/reviews, no admissions decisions, no schedule,
-- and no workshop commerce. CFP-driven speakers are hidden from the public
-- lineup, while admin-invited speakers (no submissions) remain visible so the
-- site still shows a small curated lineup.

begin;

delete from public.workshop_registrations;
delete from public.workshops;
delete from public.checkout_cart_snapshots;
delete from public.program_schedule_items;
delete from public.program_sessions;
delete from public.cfp_scheduled_emails;

update public.cfp_submissions
set
    status = 'submitted',
    decision_status = 'undecided',
    decision_at = null,
    decision_email_sent_at = null,
    scheduled_date = null,
    scheduled_start_time = null,
    scheduled_duration_minutes = null,
    room = null,
    metadata = coalesce(metadata, '{}'::jsonb) || '{"seed_phase": "cfp-first-stage"}'::jsonb,
    updated_at = now();

-- Reset visibility only for speakers tied to CFP submissions. Invited speakers
-- (no submissions, seeded as admin-managed) keep their curated lineup state so
-- the review phase still shows a handful of featured/non-featured invitees.
update public.cfp_speakers speaker
set
    is_admin_managed = false,
    is_visible = false,
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
