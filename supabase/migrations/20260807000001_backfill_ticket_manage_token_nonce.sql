-- Kept separate from the column DDL so existing rows are updated without
-- retaining the ALTER TABLE access-exclusive lock for the duration.
UPDATE public.tickets
SET manage_token_nonce = gen_random_uuid()
WHERE manage_token_nonce IS NULL;
