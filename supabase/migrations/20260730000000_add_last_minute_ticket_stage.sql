-- Migration: Add last_minute ticket stage
-- Created: 2026-07-30
-- Description: Introduces a fifth pricing stage 'last_minute' covering the final
--              two weeks before the conference (Aug 28 - Sep 11, 2026).
--              Widens the ticket_stage check constraints on tickets and
--              b2b_invoices. The legacy ticket_type enum is unchanged —
--              last_minute tickets map to the 'late_bird' legacy value in code.

BEGIN;

ALTER TABLE tickets
  DROP CONSTRAINT IF EXISTS tickets_ticket_stage_check,
  ADD CONSTRAINT tickets_ticket_stage_check
    CHECK (ticket_stage IN ('blind_bird', 'early_bird', 'general_admission', 'late_bird', 'last_minute'));

COMMENT ON COLUMN tickets.ticket_stage IS 'Purchase stage: blind_bird, early_bird, general_admission, late_bird, or last_minute (pricing period)';

ALTER TABLE b2b_invoices
  DROP CONSTRAINT IF EXISTS b2b_invoices_ticket_stage_check,
  ADD CONSTRAINT b2b_invoices_ticket_stage_check
    CHECK (ticket_stage IN ('blind_bird', 'early_bird', 'general_admission', 'late_bird', 'last_minute'));

COMMIT;
