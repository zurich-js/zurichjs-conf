-- Migration: Add ticket_stock_config singleton table
-- Created: 2026-09-04
--
-- Ticket stock limits lived as hardcoded constants in
-- src/config/pricing-stages.ts (GLOBAL_STOCK_LIMITS), so changing how many VIP
-- or student/unemployed tickets exist required a deploy. Move them into an
-- admin-editable single-row table, following the discount_config /
-- vip_perk_config pattern. The constants stay in code as the fallback used when
-- this row cannot be read.
--
-- This also introduces the standard-ticket limit, which did not exist before.
-- It is deliberately a TOTAL-ATTENDEE cap rather than a standard-only cap:
-- standard tickets are what is left of the venue once VIP and
-- student/unemployed seats are accounted for, so remaining standard stock is
-- `standard_limit - (confirmed VIP + confirmed student/unemployed + confirmed
-- standard)`. NULL means uncapped, which is the pre-migration behaviour — the
-- limit only starts biting once an admin sets a number.

BEGIN;

CREATE TABLE IF NOT EXISTS ticket_stock_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vip_limit INTEGER NOT NULL DEFAULT 52 CHECK (vip_limit >= 0),
  student_unemployed_limit INTEGER NOT NULL DEFAULT 35 CHECK (student_unemployed_limit >= 0),
  standard_limit INTEGER CHECK (standard_limit IS NULL OR standard_limit >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Singleton enforcement: only one row can ever exist
  singleton BOOLEAN NOT NULL DEFAULT TRUE UNIQUE CHECK (singleton = TRUE)
);

CREATE TRIGGER update_ticket_stock_config_updated_at
  BEFORE UPDATE ON ticket_stock_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed the single row with the limits that were hardcoded until now.
INSERT INTO ticket_stock_config (singleton)
VALUES (TRUE)
ON CONFLICT (singleton) DO NOTHING;

COMMENT ON TABLE ticket_stock_config IS 'Single-row configuration for conference ticket stock limits (VIP, student/unemployed, and the total-attendee cap that bounds standard tickets)';
COMMENT ON COLUMN ticket_stock_config.vip_limit IS 'Total VIP tickets available across all pricing stages';
COMMENT ON COLUMN ticket_stock_config.student_unemployed_limit IS 'Total student/unemployed tickets available across all pricing stages';
COMMENT ON COLUMN ticket_stock_config.standard_limit IS 'Total-attendee cap. Remaining standard stock = this value minus every confirmed ticket (VIP + student/unemployed + standard). NULL = uncapped.';

-- RLS: service role only (read server-side, edited via the admin API)
ALTER TABLE ticket_stock_config ENABLE ROW LEVEL SECURITY;

-- Reset grants declaratively so the outcome does not depend on prior state.
REVOKE ALL ON TABLE public.ticket_stock_config FROM anon;
REVOKE ALL ON TABLE public.ticket_stock_config FROM authenticated;
GRANT ALL ON TABLE public.ticket_stock_config TO service_role;

COMMIT;
