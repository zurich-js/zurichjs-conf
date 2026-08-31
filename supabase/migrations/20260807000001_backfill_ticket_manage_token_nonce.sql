-- Kept separate from the column DDL so existing rows are updated without
-- retaining the ALTER TABLE access-exclusive lock for the duration.
BEGIN;

-- The tickets table has a generic BEFORE UPDATE trigger. Suppress triggers in
-- this migration session so adding internal auth fields does not rewrite each
-- ticket's historical updated_at value. No existing business fields change.
SET LOCAL session_replication_role = replica;

UPDATE public.tickets
SET manage_token_nonce = COALESCE(manage_token_nonce, gen_random_uuid()),
    legacy_manage_token_valid = TRUE
WHERE legacy_manage_token_valid IS NULL;

COMMIT;
