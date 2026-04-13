-- Add optional hover color logo URL for sponsors
-- Used by public sponsor cards for color-on-hover display

ALTER TABLE sponsors
ADD COLUMN IF NOT EXISTS logo_url_color TEXT;

COMMENT ON COLUMN sponsors.logo_url_color IS 'Optional color logo URL shown on hover in public sponsor cards';
