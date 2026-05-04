-- Migration: Enforce singleton pattern on vip_perk_config and cleanup
-- Created: 2026-05-05

-- Add singleton column to enforce single-row constraint
ALTER TABLE vip_perk_config
  ADD COLUMN IF NOT EXISTS singleton BOOLEAN NOT NULL DEFAULT TRUE UNIQUE CHECK (singleton = TRUE);

-- Drop redundant index on vip_perks.code (UNIQUE constraint already creates one)
DROP INDEX IF EXISTS idx_vip_perks_code;
