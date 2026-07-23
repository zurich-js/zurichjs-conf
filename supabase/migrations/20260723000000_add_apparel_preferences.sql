-- Migration: Add apparel preferences for ticket holders and speaker hoodie size
-- Created: 2026-07-23
--
-- Feat 1: Ticket holders can tell us their preferred t-shirt size (XS - 4XL).
-- Feat 2: VIP ticket holders can additionally provide a hoodie size (VIP package).
-- Feat 3: Speakers already provide a t-shirt size; add hoodie size to cfp_speakers.

BEGIN;

-- One apparel preference row per ticket (1:1, keyed by ticket_id)
CREATE TABLE IF NOT EXISTS ticket_apparel_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  tshirt_size TEXT CHECK (tshirt_size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL')),
  -- Hoodie is part of the VIP package only; enforced at the API layer
  hoodie_size TEXT CHECK (hoodie_size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER update_ticket_apparel_preferences_updated_at
  BEFORE UPDATE ON ticket_apparel_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE ticket_apparel_preferences IS 'Attendee apparel size preferences - one row per ticket (unique constraint enforces 1:1)';
COMMENT ON COLUMN ticket_apparel_preferences.tshirt_size IS 'Preferred conference t-shirt size (XS-4XL); sizing is best effort, no perfect fit guaranteed';
COMMENT ON COLUMN ticket_apparel_preferences.hoodie_size IS 'Preferred hoodie size (XS-4XL) - VIP ticket holders only, part of the VIP package';

-- RLS (service role bypasses RLS; the manage-ticket flow is token-authenticated
-- and goes through the service role client, matching vip_perks)
ALTER TABLE ticket_apparel_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to ticket_apparel_preferences"
  ON ticket_apparel_preferences FOR ALL
  USING (auth.role() = 'service_role');

-- Speakers: hoodie size alongside the existing tshirt_size
ALTER TABLE cfp_speakers
ADD COLUMN IF NOT EXISTS hoodie_size TEXT CHECK (hoodie_size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'));

COMMENT ON COLUMN cfp_speakers.hoodie_size IS 'Speaker hoodie size (XS-4XL); may differ from their t-shirt size';

COMMIT;
