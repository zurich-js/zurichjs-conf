BEGIN;

CREATE TABLE IF NOT EXISTS public.manual_badge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('vip', 'attendee', 'speaker', 'sponsor', 'organizer')),
  first_name TEXT NOT NULL CHECK (length(trim(first_name)) BETWEEN 1 AND 120),
  last_name TEXT NOT NULL DEFAULT '' CHECK (length(trim(last_name)) <= 120),
  role TEXT NOT NULL DEFAULT '' CHECK (length(trim(role)) <= 200),
  company TEXT NOT NULL DEFAULT '' CHECK (length(trim(company)) <= 200),
  logo_url TEXT CHECK (logo_url IS NULL OR logo_url ~ '^https?://'),
  networking_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  networking_profile JSONB NOT NULL DEFAULT '{}'::JSONB
    CHECK (jsonb_typeof(networking_profile) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS manual_badge_entries_category_idx
  ON public.manual_badge_entries(category, first_name, last_name);

CREATE INDEX IF NOT EXISTS manual_badge_entries_enabled_share_idx
  ON public.manual_badge_entries(share_id)
  WHERE networking_enabled = TRUE;

DROP TRIGGER IF EXISTS update_manual_badge_entries_updated_at
  ON public.manual_badge_entries;
CREATE TRIGGER update_manual_badge_entries_updated_at
  BEFORE UPDATE ON public.manual_badge_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.manual_badge_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to manual badge entries"
  ON public.manual_badge_entries;
CREATE POLICY "Service role has full access to manual badge entries"
  ON public.manual_badge_entries FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

COMMENT ON TABLE public.manual_badge_entries IS
  'Admin-managed supplemental badge rows, including organizers, with stable optional networking share pages.';
COMMENT ON COLUMN public.manual_badge_entries.share_id IS
  'Opaque stable identifier used by badge-<share_id> public networking URLs.';
COMMENT ON COLUMN public.manual_badge_entries.networking_enabled IS
  'Whether the supplemental badge networking page is publicly resolvable.';

COMMIT;
