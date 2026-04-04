-- Add speaker header image for public speaker cards

ALTER TABLE cfp_speakers
ADD COLUMN header_image_url TEXT;

COMMENT ON COLUMN cfp_speakers.header_image_url IS 'Wide header image shown on public speaker cards and speaker pages.';
