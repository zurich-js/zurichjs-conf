-- Make user_id nullable in tickets table
-- This allows tickets to be created for guest purchases without requiring a profile

-- Drop the NOT NULL constraint on user_id
ALTER TABLE tickets ALTER COLUMN user_id DROP NOT NULL;

-- Update the comment
COMMENT ON COLUMN tickets.user_id IS 'Optional reference to user profile (null for guest purchases)';
