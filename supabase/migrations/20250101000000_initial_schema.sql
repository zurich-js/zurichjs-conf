-- Initial Database Schema for ZurichJS Conference Platform
-- Creates core tables for users, tickets, workshops, and registrations

-- Note: Using built-in gen_random_uuid() function (PostgreSQL 13+)
-- No extension needed

-- Custom Types
CREATE TYPE user_role AS ENUM ('attendee', 'speaker', 'admin');
CREATE TYPE ticket_type AS ENUM ('blind_bird', 'early_bird', 'standard', 'student', 'unemployed', 'late_bird', 'vip');
CREATE TYPE payment_status AS ENUM ('pending', 'confirmed', 'cancelled', 'refunded');
CREATE TYPE workshop_status AS ENUM ('draft', 'published', 'cancelled', 'completed');

-- Profiles Table
-- Extends Supabase auth.users with additional user data
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  phone TEXT,
  stripe_customer_id TEXT UNIQUE,
  role user_role NOT NULL DEFAULT 'attendee',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tickets Table
-- Stores all purchased conference tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  ticket_type ticket_type NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  stripe_customer_id TEXT NOT NULL,
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  amount_paid INTEGER NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'CHF',
  status payment_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workshops Table
-- Stores workshop information
CREATE TABLE IF NOT EXISTS workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 20,
  enrolled_count INTEGER NOT NULL DEFAULT 0,
  price INTEGER NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'CHF',
  status workshop_status NOT NULL DEFAULT 'draft',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_capacity CHECK (capacity > 0),
  CONSTRAINT valid_enrolled CHECK (enrolled_count >= 0 AND enrolled_count <= capacity)
);

-- Workshop Registrations Table
-- Stores user registrations for workshops
CREATE TABLE IF NOT EXISTS workshop_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  amount_paid INTEGER NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'CHF',
  status payment_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workshop_id, user_id)
);

-- Indexes for Performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_stripe_customer_id ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_profiles_role ON profiles(role);

CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_tickets_stripe_session_id ON tickets(stripe_session_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);

CREATE INDEX idx_workshops_status ON workshops(status);
CREATE INDEX idx_workshops_date ON workshops(date);
CREATE INDEX idx_workshops_instructor_id ON workshops(instructor_id) WHERE instructor_id IS NOT NULL;

CREATE INDEX idx_workshop_registrations_workshop_id ON workshop_registrations(workshop_id);
CREATE INDEX idx_workshop_registrations_user_id ON workshop_registrations(user_id);
CREATE INDEX idx_workshop_registrations_status ON workshop_registrations(status);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workshops_updated_at BEFORE UPDATE ON workshops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workshop_registrations_updated_at BEFORE UPDATE ON workshop_registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to sync enrolled_count when registrations change
CREATE OR REPLACE FUNCTION sync_workshop_enrolled_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE workshops
    SET enrolled_count = enrolled_count + 1
    WHERE id = NEW.workshop_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
    UPDATE workshops
    SET enrolled_count = enrolled_count + 1
    WHERE id = NEW.workshop_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
    UPDATE workshops
    SET enrolled_count = enrolled_count - 1
    WHERE id = NEW.workshop_id;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    UPDATE workshops
    SET enrolled_count = enrolled_count - 1
    WHERE id = OLD.workshop_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_workshop_enrolled_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON workshop_registrations
  FOR EACH ROW EXECUTE FUNCTION sync_workshop_enrolled_count();

-- Function to create or update user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    'attendee'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Comments for documentation
COMMENT ON TABLE profiles IS 'Extended user profile data linked to Supabase auth.users';
COMMENT ON TABLE tickets IS 'Conference ticket purchases';
COMMENT ON TABLE workshops IS 'Workshop sessions available for registration';
COMMENT ON TABLE workshop_registrations IS 'User registrations for workshops';

COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN tickets.stripe_session_id IS 'Stripe checkout session ID (unique per purchase)';
COMMENT ON COLUMN tickets.amount_paid IS 'Amount paid in cents';
COMMENT ON COLUMN workshops.enrolled_count IS 'Auto-updated count of confirmed registrations';
