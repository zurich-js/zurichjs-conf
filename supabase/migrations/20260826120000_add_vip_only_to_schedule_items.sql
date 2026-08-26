-- Add vip_only flag to program_schedule_items
-- Allows marking events as VIP-exclusive in the admin schedule editor

ALTER TABLE public.program_schedule_items
ADD COLUMN IF NOT EXISTS vip_only boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.program_schedule_items.vip_only IS 'When true, the event is displayed with a VIP-only badge on the public schedule';
