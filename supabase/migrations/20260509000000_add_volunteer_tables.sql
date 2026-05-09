-- Migration: Add volunteer management tables
-- Created: 2026-05-09
-- Tables: volunteer_roles, volunteer_applications, volunteer_profiles

-- ============================================================================
-- Table: volunteer_roles
-- ============================================================================

CREATE TABLE IF NOT EXISTS volunteer_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  summary TEXT,
  description TEXT,
  responsibilities TEXT,
  requirements TEXT,
  nice_to_haves TEXT,
  benefits TEXT,
  included_benefits TEXT,
  excluded_benefits TEXT,
  commitment_type TEXT NOT NULL CHECK (commitment_type IN (
    'workshop_day', 'conference_day', 'both_days', 'pre_event', 'remote', 'flexible'
  )),
  availability_requirements TEXT,
  location_context TEXT,
  spots_available INTEGER,
  show_spots_publicly BOOLEAN DEFAULT false,
  application_deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'published', 'closed', 'archived'
  )),
  is_public BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_volunteer_roles_slug ON volunteer_roles(slug);
CREATE INDEX idx_volunteer_roles_status ON volunteer_roles(status);
CREATE INDEX idx_volunteer_roles_sort_order ON volunteer_roles(sort_order);

CREATE TRIGGER update_volunteer_roles_updated_at
  BEFORE UPDATE ON volunteer_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE volunteer_roles IS 'Volunteer role postings for the conference job board';
COMMENT ON COLUMN volunteer_roles.slug IS 'URL-friendly identifier used in public route /volunteer/[slug]';
COMMENT ON COLUMN volunteer_roles.commitment_type IS 'Type of time commitment: workshop_day, conference_day, both_days, pre_event, remote, flexible';
COMMENT ON COLUMN volunteer_roles.included_benefits IS 'Newline-separated list of benefits included with this role';
COMMENT ON COLUMN volunteer_roles.excluded_benefits IS 'Newline-separated list of things NOT included (e.g. travel, accommodation)';
COMMENT ON COLUMN volunteer_roles.status IS 'Role lifecycle: draft, published, closed, archived';
COMMENT ON COLUMN volunteer_roles.is_public IS 'Whether the role is visible on the public volunteer page (separate from status for scheduling)';

-- ============================================================================
-- Table: volunteer_applications
-- ============================================================================

CREATE TABLE IF NOT EXISTS volunteer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id TEXT UNIQUE NOT NULL,
  role_id UUID NOT NULL REFERENCES volunteer_roles(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  linkedin_url TEXT NOT NULL,
  website_url TEXT,
  motivation TEXT NOT NULL,
  availability TEXT NOT NULL,
  relevant_experience TEXT NOT NULL,
  affiliation TEXT,
  notes TEXT,
  commitment_confirmed BOOLEAN DEFAULT false,
  exclusions_confirmed BOOLEAN DEFAULT false,
  contact_consent_confirmed BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'in_review', 'shortlisted', 'accepted', 'rejected', 'withdrawn'
  )),
  internal_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (role_id, email)
);

CREATE INDEX idx_volunteer_applications_role_id ON volunteer_applications(role_id);
CREATE INDEX idx_volunteer_applications_email ON volunteer_applications(email);
CREATE INDEX idx_volunteer_applications_status ON volunteer_applications(status);
CREATE INDEX idx_volunteer_applications_submitted_at ON volunteer_applications(submitted_at DESC);
CREATE INDEX idx_volunteer_applications_application_id ON volunteer_applications(application_id);

CREATE TRIGGER update_volunteer_applications_updated_at
  BEFORE UPDATE ON volunteer_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE volunteer_applications IS 'Volunteer applications submitted through the public job board';
COMMENT ON COLUMN volunteer_applications.application_id IS 'Human-readable application ID (e.g. VOL-XXXXX) shown to applicant';
COMMENT ON COLUMN volunteer_applications.status IS 'Application lifecycle: submitted, in_review, shortlisted, accepted, rejected, withdrawn';
COMMENT ON COLUMN volunteer_applications.commitment_confirmed IS 'Applicant confirmed they understand the time commitment';
COMMENT ON COLUMN volunteer_applications.exclusions_confirmed IS 'Applicant confirmed they understand what is not included (e.g. travel)';

-- ============================================================================
-- Table: volunteer_profiles
-- ============================================================================

CREATE TABLE IF NOT EXISTS volunteer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES volunteer_applications(id),
  role_id UUID REFERENCES volunteer_roles(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  linkedin_url TEXT,
  responsibilities TEXT,
  internal_contact TEXT,
  availability TEXT,
  status TEXT NOT NULL DEFAULT 'pending_confirmation' CHECK (status IN (
    'pending_confirmation', 'confirmed', 'active', 'cancelled', 'completed'
  )),
  is_public BOOLEAN DEFAULT false,
  public_bio TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_volunteer_profiles_application_id ON volunteer_profiles(application_id);
CREATE INDEX idx_volunteer_profiles_role_id ON volunteer_profiles(role_id);
CREATE INDEX idx_volunteer_profiles_status ON volunteer_profiles(status);

CREATE TRIGGER update_volunteer_profiles_updated_at
  BEFORE UPDATE ON volunteer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE volunteer_profiles IS 'Accepted volunteer profiles for team management and optional public display';
COMMENT ON COLUMN volunteer_profiles.application_id IS 'Reference to the original application (nullable for manually added volunteers)';
COMMENT ON COLUMN volunteer_profiles.status IS 'Profile lifecycle: pending_confirmation, confirmed, active, cancelled, completed';
COMMENT ON COLUMN volunteer_profiles.is_public IS 'Whether to display this volunteer on the public team section';
