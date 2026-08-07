BEGIN;

-- Add the nullable column without a volatile default so this stays a fast
-- catalog change instead of rewriting public.tickets under an exclusive lock.
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS manage_token_nonce UUID;

ALTER TABLE public.tickets
  ALTER COLUMN manage_token_nonce SET DEFAULT gen_random_uuid();

COMMENT ON COLUMN public.tickets.manage_token_nonce IS
  'Per-ticket nonce signed into management links and rotated whenever ticket identity changes.';

COMMIT;
