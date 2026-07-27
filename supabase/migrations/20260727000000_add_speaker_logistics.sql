-- Migration: Add speaker event logistics reconciliation
-- Created: 2026-07-27
--
-- Speakers receive a unique (HMAC token) link — shared with them manually by
-- the team — where they confirm which conference-week events they will attend
-- and provide the logistics details we need to plan catering and capacity:
--   - Warm-up meetup (Sep 9), speakers dinner (Sep 10, ~18:30-22:00),
--     VIP after party (Sep 11), speaker hangout activities (Sep 12)
--   - Dietary restrictions / allergies for the dinner and after party
--   - Plus-one flags for the dinner and after party, with the after-party
--     plus one's contact details so we can issue them a VIP ticket
--   - Special accommodations needed for their talk or workshop
-- T-shirt size is NOT stored here - it lives on cfp_speakers.tshirt_size and
-- the logistics form backfills it when missing.

BEGIN;

-- One logistics row per speaker (1:1, keyed by speaker_id)
CREATE TABLE IF NOT EXISTS cfp_speaker_logistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_id UUID NOT NULL UNIQUE REFERENCES cfp_speakers(id) ON DELETE CASCADE,

  -- Event attendance (NULL = not answered yet)
  attending_warmup BOOLEAN,
  attending_speakers_dinner BOOLEAN,
  attending_after_party BOOLEAN,
  attending_speaker_hangout BOOLEAN,

  -- Catering info for the speakers dinner (Sep 10) and VIP after party (Sep 11)
  dietary_restrictions TEXT,

  -- Speakers dinner plus one
  dinner_plus_one BOOLEAN,
  dinner_plus_one_dietary_restrictions TEXT,

  -- VIP after party plus one (contact details required to issue a VIP ticket)
  after_party_plus_one BOOLEAN,
  after_party_plus_one_first_name TEXT,
  after_party_plus_one_last_name TEXT,
  after_party_plus_one_email TEXT,

  -- Special accommodations for their talk or workshop (AV, accessibility, ...)
  talk_special_accommodations TEXT,

  -- Set on submission; the speaker's unique link is single-use and expires
  -- once this is set (changes afterwards go through the team directly)
  submitted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
CREATE TRIGGER update_cfp_speaker_logistics_updated_at
  BEFORE UPDATE ON cfp_speaker_logistics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE cfp_speaker_logistics IS 'Speaker conference-week event RSVPs and logistics (dietary, plus ones, accommodations) - one row per speaker';
COMMENT ON COLUMN cfp_speaker_logistics.attending_warmup IS 'Warm-up meetup on Sep 9, 2026 (NULL = unanswered)';
COMMENT ON COLUMN cfp_speaker_logistics.attending_speakers_dinner IS 'Speakers dinner on Sep 10, 2026, ~18:30-22:00 (NULL = unanswered)';
COMMENT ON COLUMN cfp_speaker_logistics.attending_after_party IS 'VIP after party on Sep 11, 2026 (NULL = unanswered)';
COMMENT ON COLUMN cfp_speaker_logistics.attending_speaker_hangout IS 'Speaker hangout activities on Sep 12, 2026 (NULL = unanswered)';
COMMENT ON COLUMN cfp_speaker_logistics.dietary_restrictions IS 'Speaker dietary restrictions/allergies for the dinner and after party catering';
COMMENT ON COLUMN cfp_speaker_logistics.dinner_plus_one IS 'Whether the speaker brings a plus one to the speakers dinner (Sep 10)';
COMMENT ON COLUMN cfp_speaker_logistics.dinner_plus_one_dietary_restrictions IS 'Dietary restrictions/allergies of the dinner plus one';
COMMENT ON COLUMN cfp_speaker_logistics.after_party_plus_one IS 'Whether the speaker brings a plus one to the VIP after party (Sep 11)';
COMMENT ON COLUMN cfp_speaker_logistics.after_party_plus_one_email IS 'After-party plus one email - used to issue their VIP ticket (includes 20% workshop discount)';
COMMENT ON COLUMN cfp_speaker_logistics.talk_special_accommodations IS 'Special accommodations the speaker needs for their talk or workshop';
COMMENT ON COLUMN cfp_speaker_logistics.submitted_at IS 'Submission time; the unique link expires once set (single-submission for security)';

-- RLS (service role bypasses RLS; the logistics form is token-authenticated
-- and goes through the service role client, matching ticket_apparel_preferences)
ALTER TABLE cfp_speaker_logistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to cfp_speaker_logistics"
  ON cfp_speaker_logistics FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
