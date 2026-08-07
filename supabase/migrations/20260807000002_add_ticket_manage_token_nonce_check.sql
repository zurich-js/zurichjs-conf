ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_manage_token_fields_present
  CHECK (
    manage_token_nonce IS NOT NULL
    AND legacy_manage_token_valid IS NOT NULL
  ) NOT VALID;
