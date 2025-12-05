-- CFP (Call for Papers) System Schema for ZurichJS Conference 2026
-- Creates tables for speakers, submissions, reviews, travel management

-- ============================================
-- CUSTOM TYPES
-- ============================================

CREATE TYPE cfp_submission_type AS ENUM ('lightning', 'standard', 'workshop');
CREATE TYPE cfp_talk_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE cfp_submission_status AS ENUM (
  'draft', 'submitted', 'under_review', 'waitlisted', 'accepted', 'rejected', 'withdrawn'
);
CREATE TYPE cfp_reviewer_role AS ENUM ('super_admin', 'reviewer', 'readonly');
CREATE TYPE cfp_flight_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE cfp_flight_status AS ENUM (
  'pending', 'confirmed', 'checked_in', 'boarding', 'departed', 'arrived', 'cancelled', 'delayed'
);
CREATE TYPE cfp_reimbursement_status AS ENUM ('pending', 'approved', 'rejected', 'paid');
CREATE TYPE cfp_reimbursement_type AS ENUM ('flight', 'accommodation', 'transport', 'other');

-- ============================================
-- CFP SPEAKERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cfp_speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  job_title TEXT,
  company TEXT,
  bio TEXT, -- Max 250 words, enforced in app
  linkedin_url TEXT,
  github_url TEXT,
  twitter_handle TEXT,
  bluesky_handle TEXT,
  mastodon_handle TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cfp_speakers IS 'Speaker profiles for CFP submissions';
COMMENT ON COLUMN cfp_speakers.bio IS 'Speaker biography, max 250 words enforced in application';

-- ============================================
-- CFP SUBMISSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cfp_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id UUID NOT NULL REFERENCES cfp_speakers(id) ON DELETE CASCADE,

  -- Common fields (required for all submission types)
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  submission_type cfp_submission_type NOT NULL,
  talk_level cfp_talk_level NOT NULL,
  additional_notes TEXT,
  outline TEXT,
  slides_url TEXT,
  previous_recording_url TEXT,

  -- Travel logistics
  travel_assistance_required BOOLEAN DEFAULT FALSE,
  company_can_cover_travel BOOLEAN DEFAULT FALSE,
  special_requirements TEXT,

  -- Workshop-specific fields (NULL for talks)
  workshop_duration_hours INTEGER CHECK (workshop_duration_hours IS NULL OR (workshop_duration_hours >= 2 AND workshop_duration_hours <= 8)),
  workshop_expected_compensation TEXT,
  workshop_compensation_amount INTEGER, -- in cents
  workshop_special_requirements TEXT,
  workshop_max_participants INTEGER,

  -- Status and metadata
  status cfp_submission_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  withdrawn_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: workshop fields required when submission_type is 'workshop'
  CONSTRAINT workshop_fields_check CHECK (
    submission_type != 'workshop' OR workshop_duration_hours IS NOT NULL
  )
);

COMMENT ON TABLE cfp_submissions IS 'Talk and workshop proposals submitted to CFP';
COMMENT ON COLUMN cfp_submissions.workshop_compensation_amount IS 'Expected compensation in cents';

-- ============================================
-- CFP TAGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cfp_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_suggested BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cfp_tags IS 'Tag vocabulary for categorizing submissions';
COMMENT ON COLUMN cfp_tags.is_suggested IS 'TRUE for predefined suggested tags';

-- ============================================
-- CFP SUBMISSION TAGS (MANY-TO-MANY)
-- ============================================

CREATE TABLE IF NOT EXISTS cfp_submission_tags (
  submission_id UUID NOT NULL REFERENCES cfp_submissions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES cfp_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (submission_id, tag_id)
);

COMMENT ON TABLE cfp_submission_tags IS 'Many-to-many relationship between submissions and tags';

-- ============================================
-- CFP REVIEWERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cfp_reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role cfp_reviewer_role NOT NULL DEFAULT 'reviewer',
  can_see_speaker_identity BOOLEAN DEFAULT FALSE,
  invited_by UUID REFERENCES cfp_reviewers(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cfp_reviewers IS 'CFP reviewers with role-based access';
COMMENT ON COLUMN cfp_reviewers.can_see_speaker_identity IS 'Override for anonymous review mode';

-- ============================================
-- CFP REVIEWS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cfp_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES cfp_submissions(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES cfp_reviewers(id) ON DELETE CASCADE,
  score_overall INTEGER CHECK (score_overall IS NULL OR (score_overall >= 1 AND score_overall <= 5)),
  score_relevance INTEGER CHECK (score_relevance IS NULL OR (score_relevance >= 1 AND score_relevance <= 5)),
  score_technical_depth INTEGER CHECK (score_technical_depth IS NULL OR (score_technical_depth >= 1 AND score_technical_depth <= 5)),
  score_clarity INTEGER CHECK (score_clarity IS NULL OR (score_clarity >= 1 AND score_clarity <= 5)),
  score_diversity INTEGER CHECK (score_diversity IS NULL OR (score_diversity >= 1 AND score_diversity <= 5)),
  private_notes TEXT,
  feedback_to_speaker TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (submission_id, reviewer_id)
);

COMMENT ON TABLE cfp_reviews IS 'Reviewer scores and feedback for submissions';
COMMENT ON COLUMN cfp_reviews.private_notes IS 'Notes visible only to review committee';
COMMENT ON COLUMN cfp_reviews.feedback_to_speaker IS 'Optional feedback shared with speaker';

-- ============================================
-- CFP SPEAKER TRAVEL TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cfp_speaker_travel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id UUID NOT NULL UNIQUE REFERENCES cfp_speakers(id) ON DELETE CASCADE,

  -- Attendance
  arrival_date DATE,
  departure_date DATE,
  attending_speakers_dinner BOOLEAN,
  attending_speakers_activities BOOLEAN,

  -- Requirements
  dietary_restrictions TEXT,
  accessibility_needs TEXT,

  -- Budget (set by admin)
  flight_budget_amount INTEGER, -- in cents
  flight_budget_currency TEXT DEFAULT 'CHF',

  -- Status
  travel_confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cfp_speaker_travel IS 'Travel logistics for accepted speakers';
COMMENT ON COLUMN cfp_speaker_travel.flight_budget_amount IS 'Flight budget in cents, set by admin';

-- ============================================
-- CFP SPEAKER FLIGHTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cfp_speaker_flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id UUID NOT NULL REFERENCES cfp_speakers(id) ON DELETE CASCADE,
  direction cfp_flight_direction NOT NULL,

  -- Flight details
  airline TEXT,
  flight_number TEXT,
  departure_airport TEXT,
  arrival_airport TEXT,
  departure_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  booking_reference TEXT,

  -- Tracking
  flight_status cfp_flight_status DEFAULT 'pending',
  tracking_url TEXT,
  last_status_update TIMESTAMPTZ,

  -- Cost
  cost_amount INTEGER, -- in cents
  cost_currency TEXT DEFAULT 'CHF',

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cfp_speaker_flights IS 'Flight details for speaker travel';
COMMENT ON COLUMN cfp_speaker_flights.tracking_url IS 'External flight tracker URL (e.g., FlightAware)';

-- ============================================
-- CFP SPEAKER ACCOMMODATION TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cfp_speaker_accommodation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id UUID NOT NULL REFERENCES cfp_speakers(id) ON DELETE CASCADE,

  -- Hotel details
  hotel_name TEXT,
  hotel_address TEXT,
  check_in_date DATE,
  check_out_date DATE,
  reservation_number TEXT,
  reservation_confirmation_url TEXT,

  -- Cost (if reimbursable)
  cost_amount INTEGER, -- in cents
  cost_currency TEXT DEFAULT 'CHF',
  is_covered_by_conference BOOLEAN DEFAULT TRUE,

  -- Admin notes
  admin_notes TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cfp_speaker_accommodation IS 'Hotel and accommodation details for speakers';

-- ============================================
-- CFP SPEAKER REIMBURSEMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cfp_speaker_reimbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id UUID NOT NULL REFERENCES cfp_speakers(id) ON DELETE CASCADE,

  -- Expense details
  expense_type cfp_reimbursement_type NOT NULL,
  description TEXT NOT NULL,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'CHF',
  receipt_url TEXT,

  -- Banking details (for payment)
  bank_name TEXT,
  bank_account_holder TEXT,
  iban TEXT,
  swift_bic TEXT,

  -- Status
  status cfp_reimbursement_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES cfp_reviewers(id),
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  admin_notes TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cfp_speaker_reimbursements IS 'Expense reimbursement requests from speakers';
COMMENT ON COLUMN cfp_speaker_reimbursements.amount IS 'Expense amount in cents';

-- ============================================
-- CFP CONFIG TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cfp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE cfp_config IS 'CFP configuration settings';

-- Default config entries
INSERT INTO cfp_config (key, value) VALUES
  ('cfp_status', '{"enabled": false, "open_date": null, "close_date": null}'),
  ('anonymous_review', '{"enabled": true}'),
  ('max_submissions_per_speaker', '5'),
  ('review_dimensions', '["overall", "relevance", "technical_depth", "clarity", "diversity"]'),
  ('speakers_dinner_date', 'null'),
  ('speakers_activities_info', '{"date": null, "description": null}')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- INDEXES
-- ============================================

-- Speakers
CREATE INDEX idx_cfp_speakers_email ON cfp_speakers(email);
CREATE INDEX idx_cfp_speakers_user_id ON cfp_speakers(user_id) WHERE user_id IS NOT NULL;

-- Submissions
CREATE INDEX idx_cfp_submissions_speaker ON cfp_submissions(speaker_id);
CREATE INDEX idx_cfp_submissions_status ON cfp_submissions(status);
CREATE INDEX idx_cfp_submissions_type ON cfp_submissions(submission_type);
CREATE INDEX idx_cfp_submissions_created_at ON cfp_submissions(created_at DESC);

-- Tags
CREATE INDEX idx_cfp_tags_suggested ON cfp_tags(is_suggested) WHERE is_suggested = TRUE;

-- Submission tags
CREATE INDEX idx_cfp_submission_tags_tag ON cfp_submission_tags(tag_id);

-- Reviewers
CREATE INDEX idx_cfp_reviewers_email ON cfp_reviewers(email);
CREATE INDEX idx_cfp_reviewers_active ON cfp_reviewers(is_active) WHERE is_active = TRUE;

-- Reviews
CREATE INDEX idx_cfp_reviews_submission ON cfp_reviews(submission_id);
CREATE INDEX idx_cfp_reviews_reviewer ON cfp_reviews(reviewer_id);

-- Travel
CREATE INDEX idx_cfp_speaker_travel_speaker ON cfp_speaker_travel(speaker_id);

-- Flights
CREATE INDEX idx_cfp_speaker_flights_speaker ON cfp_speaker_flights(speaker_id);
CREATE INDEX idx_cfp_speaker_flights_direction ON cfp_speaker_flights(direction);
CREATE INDEX idx_cfp_speaker_flights_departure ON cfp_speaker_flights(departure_time);

-- Accommodation
CREATE INDEX idx_cfp_speaker_accommodation_speaker ON cfp_speaker_accommodation(speaker_id);

-- Reimbursements
CREATE INDEX idx_cfp_speaker_reimbursements_speaker ON cfp_speaker_reimbursements(speaker_id);
CREATE INDEX idx_cfp_speaker_reimbursements_status ON cfp_speaker_reimbursements(status);

-- ============================================
-- UPDATE TRIGGERS
-- ============================================

CREATE TRIGGER update_cfp_speakers_updated_at BEFORE UPDATE ON cfp_speakers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cfp_submissions_updated_at BEFORE UPDATE ON cfp_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cfp_reviewers_updated_at BEFORE UPDATE ON cfp_reviewers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cfp_reviews_updated_at BEFORE UPDATE ON cfp_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cfp_speaker_travel_updated_at BEFORE UPDATE ON cfp_speaker_travel
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cfp_speaker_flights_updated_at BEFORE UPDATE ON cfp_speaker_flights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cfp_speaker_accommodation_updated_at BEFORE UPDATE ON cfp_speaker_accommodation
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cfp_speaker_reimbursements_updated_at BEFORE UPDATE ON cfp_speaker_reimbursements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cfp_config_updated_at BEFORE UPDATE ON cfp_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEED SUGGESTED TAGS
-- ============================================

INSERT INTO cfp_tags (name, is_suggested) VALUES
  ('JavaScript', TRUE),
  ('TypeScript', TRUE),
  ('React', TRUE),
  ('Vue', TRUE),
  ('Angular', TRUE),
  ('Svelte', TRUE),
  ('Node.js', TRUE),
  ('Deno', TRUE),
  ('Bun', TRUE),
  ('Next.js', TRUE),
  ('Nuxt', TRUE),
  ('Remix', TRUE),
  ('Testing', TRUE),
  ('Performance', TRUE),
  ('Security', TRUE),
  ('Accessibility', TRUE),
  ('DevOps', TRUE),
  ('CI/CD', TRUE),
  ('Tooling', TRUE),
  ('Build Systems', TRUE),
  ('Web APIs', TRUE),
  ('WebAssembly', TRUE),
  ('PWA', TRUE),
  ('Mobile', TRUE),
  ('State Management', TRUE),
  ('GraphQL', TRUE),
  ('REST', TRUE),
  ('Database', TRUE),
  ('AI/ML', TRUE),
  ('Open Source', TRUE),
  ('Career', TRUE),
  ('Best Practices', TRUE)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- STORAGE BUCKET FOR CFP IMAGES
-- ============================================

-- Create storage bucket for CFP images (profile photos, receipts)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cfp-images',
  'cfp-images',
  TRUE,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for cfp-images bucket
CREATE POLICY "Authenticated users can upload CFP images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cfp-images');

CREATE POLICY "Anyone can view CFP images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'cfp-images');

CREATE POLICY "Users can update their own CFP images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'cfp-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own CFP images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cfp-images' AND auth.uid()::text = (storage.foldername(name))[1]);
