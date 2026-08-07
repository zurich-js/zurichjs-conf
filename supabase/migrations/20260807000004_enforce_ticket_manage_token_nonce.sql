BEGIN;

ALTER TABLE public.tickets
  ALTER COLUMN manage_token_nonce SET NOT NULL;

ALTER TABLE public.tickets
  ALTER COLUMN legacy_manage_token_valid SET NOT NULL;

ALTER TABLE public.tickets
  DROP CONSTRAINT tickets_manage_token_fields_present;

COMMIT;
