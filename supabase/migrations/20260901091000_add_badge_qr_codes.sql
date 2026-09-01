BEGIN;

CREATE TABLE IF NOT EXISTS public.badge_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  subject_key TEXT NOT NULL UNIQUE CHECK (length(subject_key) BETWEEN 3 AND 240),
  target_public_id TEXT NOT NULL CHECK (length(target_public_id) BETWEEN 3 AND 240),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS badge_qr_codes_code_idx
  ON public.badge_qr_codes(code);

DROP TRIGGER IF EXISTS update_badge_qr_codes_updated_at
  ON public.badge_qr_codes;
CREATE TRIGGER update_badge_qr_codes_updated_at
  BEFORE UPDATE ON public.badge_qr_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.badge_qr_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to badge QR codes"
  ON public.badge_qr_codes;
CREATE POLICY "Service role has full access to badge QR codes"
  ON public.badge_qr_codes FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

COMMENT ON TABLE public.badge_qr_codes IS
  'Admin-managed, independently rotatable QR tokens that redirect printed badges to stable networking share pages.';
COMMENT ON COLUMN public.badge_qr_codes.subject_key IS
  'Stable internal source identifier such as attendee:<ticket-id>, speaker:<id>, sponsor:<id>, or manual:<id>.';
COMMENT ON COLUMN public.badge_qr_codes.target_public_id IS
  'Stable public networking identifier resolved by /share/<id>; rotating code never changes this target.';

COMMIT;
