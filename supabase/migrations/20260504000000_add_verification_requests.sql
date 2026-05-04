-- Migration: Add verification_requests table for student/unemployed ticket verification
-- Created: 2026-05-04

-- Create verification_requests table
CREATE TABLE IF NOT EXISTS verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id TEXT UNIQUE NOT NULL,  -- e.g., VER-XXXXX
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('student', 'unemployed')),
  student_id TEXT,
  university TEXT,
  linkedin_url TEXT,
  rav_registration_date DATE,
  additional_info TEXT,
  price_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  -- Stripe payment link fields (populated on approval)
  stripe_payment_link_id TEXT,
  stripe_payment_link_url TEXT,
  -- Completion tracking
  stripe_session_id TEXT,  -- stored when payment is completed
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,  -- email or identifier of admin who reviewed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_verification_requests_email ON verification_requests(email);
CREATE INDEX idx_verification_requests_status ON verification_requests(status);
CREATE INDEX idx_verification_requests_verification_id ON verification_requests(verification_id);
CREATE INDEX idx_verification_requests_created_at ON verification_requests(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_verification_requests_updated_at
  BEFORE UPDATE ON verification_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE verification_requests IS 'Tracks student/unemployed verification requests for discounted ticket purchases';
COMMENT ON COLUMN verification_requests.verification_id IS 'Human-readable verification ID (e.g., VER-XXXXX) shown to user';
COMMENT ON COLUMN verification_requests.status IS 'Current state: pending, approved (payment link sent), or rejected';
COMMENT ON COLUMN verification_requests.stripe_session_id IS 'Checkout session ID when payment link is completed, for audit trail';
