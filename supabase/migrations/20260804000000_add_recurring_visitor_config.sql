-- Migration: Make the recurring-visitor discount fully admin-configurable
-- Created: 2026-08-04
--
-- A visitor on their Nth visit who still hasn't bought is hesitating, and price
-- is the likeliest reason, so they're offered a sweetened discount shown without
-- the usual dwell delay. The offer percentage and validity already live in the
-- abc_* columns (previously the retired price-sensitive experiment variant), but
-- the visit threshold was a hardcoded constant. Move it here so the whole
-- behaviour is tunable from the admin UI with no deploy.

BEGIN;

ALTER TABLE discount_config
  ADD COLUMN IF NOT EXISTS recurring_min_visits INTEGER NOT NULL DEFAULT 3
    CHECK (recurring_min_visits >= 2);

COMMENT ON COLUMN discount_config.recurring_min_visits IS
  'Visit number at which a non-buyer is treated as price-sensitive and shown the recurring offer immediately. Minimum 2 — a threshold of 1 would make the sweetened offer the standard one.';

-- Re-point the repurposed variant columns at their current meaning.
COMMENT ON COLUMN discount_config.abc_percent_off IS
  'Recurring-visitor offer: discount percentage. Set equal to ab_percent_off to disable the behaviour.';
COMMENT ON COLUMN discount_config.abc_duration_minutes IS
  'Recurring-visitor offer: code validity in minutes';

-- Mark the eligibility-gating columns as retired. The popup is now offered to
-- every visitor, so nothing reads these; they are kept for historical rows.
COMMENT ON COLUMN discount_config.show_probability IS
  'RETIRED — no longer read. The popup is offered to every eligible visitor.';
COMMENT ON COLUMN discount_config.cooldown_hours IS
  'RETIRED — no longer read. Suppression is limited to ticket holders, corporate buyers and explicit dismissals.';
COMMENT ON COLUMN discount_config.force_show IS
  'RETIRED — no longer read. Showing the popup is the default.';

COMMIT;
