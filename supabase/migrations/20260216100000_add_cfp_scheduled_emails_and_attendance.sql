-- CFP Scheduled Emails and Attendance Confirmation
-- Adds email scheduling infrastructure and speaker attendance tracking

-- ============================================
-- CFP SCHEDULED EMAILS TABLE
-- ============================================

CREATE TYPE cfp_email_type AS ENUM ('acceptance', 'rejection');
CREATE TYPE cfp_scheduled_email_status AS ENUM ('pending', 'sent', 'cancelled', 'failed');

CREATE TABLE IF NOT EXISTS cfp_scheduled_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES cfp_submissions(id) ON DELETE CASCADE,
  email_type cfp_email_type NOT NULL,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  resend_email_id TEXT, -- Resend's email ID for cancellation

  -- Status tracking
  status cfp_scheduled_email_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,

  -- Email content snapshot (stored at scheduling time)
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  talk_title TEXT NOT NULL,
  personal_message TEXT,

  -- Coupon details (for rejection emails)
  coupon_code TEXT,
  coupon_discount_percent INTEGER,
  coupon_expires_at TIMESTAMPTZ,

  -- Feedback to include (for rejection emails)
  include_feedback BOOLEAN DEFAULT FALSE,
  feedback_text TEXT,

  -- Metadata
  scheduled_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate scheduled emails for same submission + type
  CONSTRAINT unique_pending_email UNIQUE (submission_id, email_type, status)
    DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE cfp_scheduled_emails IS 'Tracks scheduled CFP decision emails with 30-min delay';
COMMENT ON COLUMN cfp_scheduled_emails.scheduled_for IS 'When the email should be sent (typically now + 30 minutes)';
COMMENT ON COLUMN cfp_scheduled_emails.resend_email_id IS 'Resend email ID for cancellation via API';

-- ============================================
-- CFP SPEAKER ATTENDANCE TABLE
-- ============================================

CREATE TYPE cfp_attendance_status AS ENUM ('pending', 'confirmed', 'declined');

CREATE TABLE IF NOT EXISTS cfp_speaker_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id UUID NOT NULL REFERENCES cfp_speakers(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES cfp_submissions(id) ON DELETE CASCADE,

  -- Response
  status cfp_attendance_status NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMPTZ,

  -- Decline details
  decline_reason TEXT, -- 'conflict', 'travel', 'personal', 'other'
  decline_notes TEXT,

  -- Confirmation token (for secure URL access)
  confirmation_token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL,
  token_used_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(speaker_id, submission_id)
);

COMMENT ON TABLE cfp_speaker_attendance IS 'Tracks speaker attendance confirmation for accepted talks';
COMMENT ON COLUMN cfp_speaker_attendance.confirmation_token IS 'Secure token for email-based confirmation link';

-- ============================================
-- ADD COLUMNS TO CFP_SUBMISSIONS
-- ============================================

-- Track scheduled email state directly on submission for quick UI access
ALTER TABLE cfp_submissions
ADD COLUMN IF NOT EXISTS acceptance_email_scheduled_for TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS acceptance_email_scheduled_id UUID REFERENCES cfp_scheduled_emails(id),
ADD COLUMN IF NOT EXISTS rejection_email_scheduled_for TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_email_scheduled_id UUID REFERENCES cfp_scheduled_emails(id);

COMMENT ON COLUMN cfp_submissions.acceptance_email_scheduled_for IS 'When acceptance email is scheduled to send (null if not scheduled or already sent)';
COMMENT ON COLUMN cfp_submissions.rejection_email_scheduled_for IS 'When rejection email is scheduled to send (null if not scheduled or already sent)';

-- ============================================
-- INDEXES
-- ============================================

-- Scheduled emails
CREATE INDEX idx_cfp_scheduled_emails_submission ON cfp_scheduled_emails(submission_id);
CREATE INDEX idx_cfp_scheduled_emails_status ON cfp_scheduled_emails(status) WHERE status = 'pending';
CREATE INDEX idx_cfp_scheduled_emails_scheduled_for ON cfp_scheduled_emails(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_cfp_scheduled_emails_type ON cfp_scheduled_emails(email_type);

-- Attendance
CREATE INDEX idx_cfp_speaker_attendance_speaker ON cfp_speaker_attendance(speaker_id);
CREATE INDEX idx_cfp_speaker_attendance_submission ON cfp_speaker_attendance(submission_id);
CREATE INDEX idx_cfp_speaker_attendance_token ON cfp_speaker_attendance(confirmation_token);
CREATE INDEX idx_cfp_speaker_attendance_status ON cfp_speaker_attendance(status);

-- Submission scheduled email columns
CREATE INDEX idx_cfp_submissions_acceptance_scheduled ON cfp_submissions(acceptance_email_scheduled_for)
  WHERE acceptance_email_scheduled_for IS NOT NULL;
CREATE INDEX idx_cfp_submissions_rejection_scheduled ON cfp_submissions(rejection_email_scheduled_for)
  WHERE rejection_email_scheduled_for IS NOT NULL;

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

CREATE TRIGGER update_cfp_scheduled_emails_updated_at BEFORE UPDATE ON cfp_scheduled_emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cfp_speaker_attendance_updated_at BEFORE UPDATE ON cfp_speaker_attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
