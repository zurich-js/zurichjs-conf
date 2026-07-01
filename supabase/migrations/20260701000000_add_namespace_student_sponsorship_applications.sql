BEGIN;

CREATE TABLE IF NOT EXISTS namespace_student_sponsorship_reviewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS namespace_student_sponsorship_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text,
  university_name text,
  degree_name text,
  github_url text,
  code_url text,
  setup_instructions text,
  pride_explanation text,
  anything_else text,
  processing_consent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'partial' CHECK (status IN ('partial', 'submitted')),
  posthog_session_id text,
  posthog_distinct_id text,
  user_agent text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS namespace_student_sponsorship_applications_email_idx
  ON namespace_student_sponsorship_applications (lower(email));

CREATE INDEX IF NOT EXISTS namespace_student_sponsorship_applications_status_idx
  ON namespace_student_sponsorship_applications (status, updated_at DESC);

ALTER TABLE namespace_student_sponsorship_reviewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE namespace_student_sponsorship_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "namespace_reviewers_can_read_reviewers"
  ON namespace_student_sponsorship_reviewers
  FOR SELECT
  USING (lower(email) = lower((auth.jwt() ->> 'email')));

CREATE POLICY "namespace_reviewers_can_read_applications"
  ON namespace_student_sponsorship_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM namespace_student_sponsorship_reviewers reviewer
      WHERE lower(reviewer.email) = lower((auth.jwt() ->> 'email'))
    )
  );

CREATE OR REPLACE FUNCTION set_namespace_student_sponsorship_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_namespace_student_sponsorship_applications_updated_at
  ON namespace_student_sponsorship_applications;

CREATE TRIGGER set_namespace_student_sponsorship_applications_updated_at
  BEFORE UPDATE ON namespace_student_sponsorship_applications
  FOR EACH ROW
  EXECUTE FUNCTION set_namespace_student_sponsorship_updated_at();

COMMIT;
