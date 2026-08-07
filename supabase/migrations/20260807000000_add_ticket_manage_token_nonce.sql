BEGIN;

-- Add the nullable column without a volatile default so this stays a fast
-- catalog change instead of rewriting public.tickets under an exclusive lock.
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS manage_token_nonce UUID;

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS legacy_manage_token_valid BOOLEAN;

ALTER TABLE public.tickets
  ALTER COLUMN manage_token_nonce SET DEFAULT gen_random_uuid();

ALTER TABLE public.tickets
  -- The old application may still issue legacy links while migrations deploy.
  -- New application code explicitly writes FALSE for newly created tickets.
  ALTER COLUMN legacy_manage_token_valid SET DEFAULT TRUE;

COMMENT ON COLUMN public.tickets.manage_token_nonce IS
  'Per-ticket nonce signed into management links and rotated whenever ticket identity changes.';
COMMENT ON COLUMN public.tickets.legacy_manage_token_valid IS
  'Temporary compatibility gate for manage links issued before nonce-bound tokens were deployed.';

COMMIT;
