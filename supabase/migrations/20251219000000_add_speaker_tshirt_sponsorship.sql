-- Add t-shirt size and company sponsorship interest to cfp_speakers
-- These fields help with conference logistics and sponsorship outreach

-- Add t-shirt size column
ALTER TABLE cfp_speakers
ADD COLUMN IF NOT EXISTS tshirt_size TEXT CHECK (tshirt_size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'));

-- Add company sponsorship interest column
ALTER TABLE cfp_speakers
ADD COLUMN IF NOT EXISTS company_interested_in_sponsoring BOOLEAN DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN cfp_speakers.tshirt_size IS 'Speaker t-shirt size for conference swag';
COMMENT ON COLUMN cfp_speakers.company_interested_in_sponsoring IS 'Whether the speaker company may be interested in sponsoring the conference';
