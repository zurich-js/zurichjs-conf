-- Add scheduling fields to submissions for conference agenda
-- These fields are nullable to support TBD scheduling

ALTER TABLE cfp_submissions
ADD COLUMN scheduled_date DATE,
ADD COLUMN scheduled_start_time TIME,
ADD COLUMN scheduled_duration_minutes INTEGER,
ADD COLUMN room VARCHAR(100);

-- Add comments explaining the fields
COMMENT ON COLUMN cfp_submissions.scheduled_date IS 'The date when this session is scheduled (null = TBD)';
COMMENT ON COLUMN cfp_submissions.scheduled_start_time IS 'The start time of the session (null = TBD)';
COMMENT ON COLUMN cfp_submissions.scheduled_duration_minutes IS 'Duration in minutes (null = TBD, typically 25 for lightning, 45 for standard, 180 for workshop)';
COMMENT ON COLUMN cfp_submissions.room IS 'The room/venue where the session will take place (null = TBD)';

-- Create index for querying scheduled sessions
CREATE INDEX idx_cfp_submissions_schedule ON cfp_submissions (scheduled_date, scheduled_start_time)
WHERE scheduled_date IS NOT NULL;
