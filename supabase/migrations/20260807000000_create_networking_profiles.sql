BEGIN;

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS manage_token_nonce UUID NOT NULL DEFAULT gen_random_uuid();

CREATE TABLE IF NOT EXISTS public.networking_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('attendee', 'sponsor')),
  ticket_id UUID UNIQUE REFERENCES public.tickets(id) ON DELETE CASCADE,
  sponsor_id UUID UNIQUE REFERENCES public.sponsors(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  profile JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(profile) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT networking_profiles_exactly_one_subject
    CHECK (num_nonnulls(ticket_id, sponsor_id) = 1),
  CONSTRAINT networking_profiles_subject_type_matches_reference
    CHECK (
      (subject_type = 'attendee' AND ticket_id IS NOT NULL AND sponsor_id IS NULL)
      OR
      (subject_type = 'sponsor' AND sponsor_id IS NOT NULL AND ticket_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS networking_profiles_subject_type_idx
  ON public.networking_profiles(subject_type);

CREATE INDEX IF NOT EXISTS networking_profiles_enabled_share_idx
  ON public.networking_profiles(share_id)
  WHERE enabled = TRUE;

DROP TRIGGER IF EXISTS update_networking_profiles_updated_at ON public.networking_profiles;
CREATE TRIGGER update_networking_profiles_updated_at
  BEFORE UPDATE ON public.networking_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.rotate_ticket_manage_token_on_identity_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.first_name, NEW.last_name, NEW.email)
    IS DISTINCT FROM
    (OLD.first_name, OLD.last_name, OLD.email)
  THEN
    NEW.manage_token_nonce := gen_random_uuid();
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_attendee_networking_on_ticket_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.first_name, NEW.last_name, NEW.email)
      IS DISTINCT FROM
      (OLD.first_name, OLD.last_name, OLD.email)
    OR (OLD.status = 'confirmed' AND NEW.status <> 'confirmed')
  THEN
    DELETE FROM public.networking_profiles
    WHERE subject_type = 'attendee' AND ticket_id = OLD.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rotate_ticket_manage_token_before_identity_change ON public.tickets;
CREATE TRIGGER rotate_ticket_manage_token_before_identity_change
  BEFORE UPDATE OF first_name, last_name, email ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.rotate_ticket_manage_token_on_identity_change();

DROP TRIGGER IF EXISTS revoke_attendee_networking_after_ticket_change ON public.tickets;
CREATE TRIGGER revoke_attendee_networking_after_ticket_change
  AFTER UPDATE OF first_name, last_name, email, status ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.revoke_attendee_networking_on_ticket_change();

CREATE OR REPLACE FUNCTION public.update_attendee_networking_profile(
  p_ticket_id UUID,
  p_manage_token_nonce UUID,
  p_enabled BOOLEAN,
  p_profile JSONB
)
RETURNS TABLE (
  result TEXT,
  share_id UUID,
  enabled BOOLEAN,
  profile JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_nonce UUID;
  current_status public.payment_status;
  saved_profile public.networking_profiles%ROWTYPE;
BEGIN
  SELECT tickets.manage_token_nonce, tickets.status
    INTO current_nonce, current_status
  FROM public.tickets
  WHERE tickets.id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::TEXT, NULL::UUID, NULL::BOOLEAN, NULL::JSONB;
    RETURN;
  END IF;

  IF current_nonce IS DISTINCT FROM p_manage_token_nonce THEN
    RETURN QUERY SELECT 'invalid_token'::TEXT, NULL::UUID, NULL::BOOLEAN, NULL::JSONB;
    RETURN;
  END IF;

  IF p_enabled AND current_status <> 'confirmed' THEN
    RETURN QUERY SELECT 'ticket_not_confirmed'::TEXT, NULL::UUID, NULL::BOOLEAN, NULL::JSONB;
    RETURN;
  END IF;

  INSERT INTO public.networking_profiles (subject_type, ticket_id, enabled, profile)
  VALUES ('attendee', p_ticket_id, p_enabled, p_profile)
  ON CONFLICT (ticket_id) DO UPDATE
  SET enabled = EXCLUDED.enabled,
      profile = EXCLUDED.profile
  RETURNING * INTO saved_profile;

  RETURN QUERY
  SELECT 'ok'::TEXT, saved_profile.share_id, saved_profile.enabled, saved_profile.profile;
END;
$$;

REVOKE ALL ON FUNCTION public.update_attendee_networking_profile(UUID, UUID, BOOLEAN, JSONB)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_attendee_networking_profile(UUID, UUID, BOOLEAN, JSONB)
  TO service_role;

ALTER TABLE public.networking_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to networking profiles"
  ON public.networking_profiles FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

COMMENT ON TABLE public.networking_profiles IS
  'Public networking contact settings for attendee tickets and sponsors. Access is mediated by token-authenticated or admin APIs.';
COMMENT ON COLUMN public.networking_profiles.share_id IS
  'Opaque public identifier used in networking share URLs; distinct from ticket and sponsor IDs.';
COMMENT ON COLUMN public.networking_profiles.profile IS
  'Validated versioned networking contact data. Only explicitly configured fields are exposed publicly.';
COMMENT ON COLUMN public.tickets.manage_token_nonce IS
  'Per-ticket nonce signed into management links and rotated whenever ticket identity changes.';
COMMENT ON FUNCTION public.rotate_ticket_manage_token_on_identity_change() IS
  'Rotates a ticket management nonce before attendee identity changes, revoking previously issued links.';
COMMENT ON FUNCTION public.revoke_attendee_networking_on_ticket_change() IS
  'Deletes an attendee networking profile when identity changes or a confirmed ticket becomes inactive.';
COMMENT ON FUNCTION public.update_attendee_networking_profile(UUID, UUID, BOOLEAN, JSONB) IS
  'Atomically checks a locked ticket nonce and status before updating attendee networking settings.';

COMMIT;
