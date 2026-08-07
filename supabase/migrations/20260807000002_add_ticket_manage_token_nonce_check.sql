ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_manage_token_nonce_present
  CHECK (manage_token_nonce IS NOT NULL) NOT VALID;
