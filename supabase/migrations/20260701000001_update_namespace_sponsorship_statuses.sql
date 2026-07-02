BEGIN;

ALTER TABLE namespace_student_sponsorship_applications
  DROP CONSTRAINT IF EXISTS namespace_student_sponsorship_applications_status_check;

UPDATE namespace_student_sponsorship_applications
SET status = 'email_sent'
WHERE status = 'submitted';

ALTER TABLE namespace_student_sponsorship_applications
  ADD CONSTRAINT namespace_student_sponsorship_applications_status_check
  CHECK (status IN ('partial', 'submission_failed', 'email_sent'));

COMMIT;
