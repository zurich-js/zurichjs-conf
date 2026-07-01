BEGIN;

DROP INDEX IF EXISTS namespace_student_sponsorship_applications_email_idx;

CREATE INDEX IF NOT EXISTS namespace_student_sponsorship_applications_email_idx
  ON namespace_student_sponsorship_applications (email);

COMMIT;
