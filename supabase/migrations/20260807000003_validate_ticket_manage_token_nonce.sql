-- Validation permits normal reads and writes while proving the later NOT NULL
-- change does not need another full-table scan.
ALTER TABLE public.tickets
  VALIDATE CONSTRAINT tickets_manage_token_fields_present;
