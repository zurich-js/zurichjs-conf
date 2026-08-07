BEGIN;

ALTER TABLE public.tickets
  ALTER COLUMN manage_token_nonce SET NOT NULL;

ALTER TABLE public.tickets
  DROP CONSTRAINT tickets_manage_token_nonce_present;

COMMIT;
