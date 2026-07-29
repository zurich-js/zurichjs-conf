-- Migration: Add speaker activity guests
-- Created: 2026-07-28
--
-- Admins invite extra people to the speaker-week activities beyond the
-- speakers themselves — a speaker's plus one collected outside the logistics
-- form, volunteers, complimentary invites, or external guests who paid for
-- their seat (tracked with the amount and the Stripe link they paid through).
-- One row per guest per activity so the logistics tab can reconcile
-- headcounts, catering, and payments in one place.

BEGIN;

CREATE TABLE IF NOT EXISTS speaker_activity_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity TEXT NOT NULL CHECK (activity IN ('warmup', 'speakers_dinner', 'after_party', 'speaker_hangout')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  guest_type TEXT NOT NULL CHECK (guest_type IN ('speaker_plus_one', 'volunteer', 'complimentary', 'paid')),
  related_speaker_id UUID REFERENCES cfp_speakers(id) ON DELETE SET NULL,
  amount_paid INTEGER CHECK (amount_paid >= 0),
  stripe_payment_link TEXT,
  dietary_restrictions TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_speaker_activity_guests_activity
  ON speaker_activity_guests(activity);
CREATE INDEX IF NOT EXISTS idx_speaker_activity_guests_related_speaker_id
  ON speaker_activity_guests(related_speaker_id);

CREATE TRIGGER update_speaker_activity_guests_updated_at
  BEFORE UPDATE ON speaker_activity_guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE speaker_activity_guests IS 'Admin-managed additional guests for speaker-week activities (plus ones, volunteers, complimentary invites, paying externals) - one row per guest per activity';
COMMENT ON COLUMN speaker_activity_guests.activity IS 'Which speaker-week activity the guest is invited to; keys match SPEAKER_LOGISTICS_EVENTS in src/data/speaker-logistics-events.ts';
COMMENT ON COLUMN speaker_activity_guests.guest_type IS 'How the guest got their seat: speaker_plus_one, volunteer, complimentary, or paid';
COMMENT ON COLUMN speaker_activity_guests.related_speaker_id IS 'The speaker the guest is a plus one of (guest_type = speaker_plus_one)';
COMMENT ON COLUMN speaker_activity_guests.amount_paid IS 'Amount the guest paid in cents/rappen (guest_type = paid)';
COMMENT ON COLUMN speaker_activity_guests.stripe_payment_link IS 'Stripe payment link / receipt URL the guest paid through (guest_type = paid)';

-- RLS (service role bypasses RLS; all access goes through admin API routes
-- using the service role client, matching cfp_speaker_logistics)
ALTER TABLE speaker_activity_guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to speaker_activity_guests"
  ON speaker_activity_guests FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
