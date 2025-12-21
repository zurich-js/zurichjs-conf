-- Add 'shortlisted' status to cfp_submission_status enum
-- This status represents submissions that are top candidates for final selection

ALTER TYPE cfp_submission_status ADD VALUE 'shortlisted' AFTER 'under_review';
