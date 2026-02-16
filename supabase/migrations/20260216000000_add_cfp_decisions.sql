-- CFP Decision Workflow Migration
-- Adds decision tracking columns and audit log table

-- ============================================
-- ADD DECISION COLUMNS TO CFP_SUBMISSIONS
-- ============================================

-- Decision status type (separate from submission status)
CREATE TYPE cfp_decision_status AS ENUM ('undecided', 'accepted', 'rejected');

-- Add decision columns to cfp_submissions
ALTER TABLE cfp_submissions
ADD COLUMN IF NOT EXISTS decision_status cfp_decision_status DEFAULT 'undecided',
ADD COLUMN IF NOT EXISTS decision_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS decision_by TEXT,
ADD COLUMN IF NOT EXISTS decision_notes TEXT,
ADD COLUMN IF NOT EXISTS coupon_code TEXT,
ADD COLUMN IF NOT EXISTS coupon_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS decision_email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS decision_email_id TEXT;

COMMENT ON COLUMN cfp_submissions.decision_status IS 'Final decision on submission (undecided, accepted, rejected)';
COMMENT ON COLUMN cfp_submissions.decision_at IS 'When the decision was made';
COMMENT ON COLUMN cfp_submissions.decision_by IS 'Admin who made the decision';
COMMENT ON COLUMN cfp_submissions.decision_notes IS 'Internal notes about the decision';
COMMENT ON COLUMN cfp_submissions.coupon_code IS 'Discount coupon for rejected speakers';
COMMENT ON COLUMN cfp_submissions.coupon_generated_at IS 'When the coupon was generated';
COMMENT ON COLUMN cfp_submissions.decision_email_sent_at IS 'When the decision email was sent';
COMMENT ON COLUMN cfp_submissions.decision_email_id IS 'Email service ID for tracking';

-- ============================================
-- CFP DECISION EVENTS TABLE (AUDIT LOG)
-- ============================================

CREATE TYPE cfp_decision_event_type AS ENUM (
  'decision_made',
  'email_sent',
  'coupon_generated',
  'decision_changed'
);

CREATE TABLE IF NOT EXISTS cfp_decision_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES cfp_submissions(id) ON DELETE CASCADE,
  event_type cfp_decision_event_type NOT NULL,
  previous_status cfp_decision_status,
  new_status cfp_decision_status NOT NULL,
  admin_id TEXT NOT NULL,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cfp_decision_events IS 'Audit log for CFP decision changes';
COMMENT ON COLUMN cfp_decision_events.event_type IS 'Type of decision event';
COMMENT ON COLUMN cfp_decision_events.previous_status IS 'Status before the change';
COMMENT ON COLUMN cfp_decision_events.new_status IS 'Status after the change';
COMMENT ON COLUMN cfp_decision_events.admin_id IS 'Admin who triggered the event';
COMMENT ON COLUMN cfp_decision_events.metadata IS 'Additional event data (email_id, coupon_code, etc)';

-- ============================================
-- INDEXES
-- ============================================

-- Decision columns
CREATE INDEX idx_cfp_submissions_decision_status ON cfp_submissions(decision_status);
CREATE INDEX idx_cfp_submissions_decision_at ON cfp_submissions(decision_at DESC) WHERE decision_at IS NOT NULL;

-- Decision events
CREATE INDEX idx_cfp_decision_events_submission ON cfp_decision_events(submission_id);
CREATE INDEX idx_cfp_decision_events_created_at ON cfp_decision_events(created_at DESC);
CREATE INDEX idx_cfp_decision_events_admin ON cfp_decision_events(admin_id);
CREATE INDEX idx_cfp_decision_events_type ON cfp_decision_events(event_type);
