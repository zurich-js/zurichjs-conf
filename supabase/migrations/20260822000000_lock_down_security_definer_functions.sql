-- Actually revoke EXECUTE on the existing SECURITY DEFINER functions.
--
-- 20260420000001 and 20260820010000 both intended this. The latter's commit
-- message says EXECUTE was "revoked from PUBLIC ... and granted to service_role
-- only", and the migration does contain:
--
--   REVOKE ALL ON FUNCTION insert_workshop_registration_atomic(...) FROM PUBLIC;
--   GRANT EXECUTE ON FUNCTION insert_workshop_registration_atomic(...) TO service_role;
--
-- That revoke does not do what it looks like on a Supabase project. Supabase's
-- base setup runs
--
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;
--
-- so every new function in public is granted EXECUTE to those roles DIRECTLY at
-- creation. A direct grant is independent of the PUBLIC grant, so revoking from
-- PUBLIC leaves it untouched. The functions remained callable by anyone holding
-- the publishable key, which ships in the client bundle by design.
--
-- insert_workshop_registration_atomic is the one that matters: it is
-- SECURITY DEFINER, it inserts workshop_registrations, and its capacity gate is
-- the only remaining protection against overselling now that the table
-- constraint has been relaxed to advisory. get_program_speaker_count only
-- returns a count, so its exposure is minor, but it is fixed here for
-- consistency.
--
-- handle_new_user is an auth.users trigger function and is deliberately left
-- alone: it is invoked by the trigger, not by a client, and changing its grants
-- is not needed to make it unreachable.
--
-- Verify on the live project with:
--   SELECT p.proname, has_function_privilege('anon', p.oid, 'EXECUTE')
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.prosecdef;

BEGIN;

REVOKE ALL ON FUNCTION public.insert_workshop_registration_atomic(
  UUID, UUID, UUID, TEXT, TEXT, INTEGER, TEXT, public.payment_status,
  TEXT, TEXT, TEXT, TEXT, UUID, UUID, INTEGER, INTEGER, JSONB, BOOLEAN
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.insert_workshop_registration_atomic(
  UUID, UUID, UUID, TEXT, TEXT, INTEGER, TEXT, public.payment_status,
  TEXT, TEXT, TEXT, TEXT, UUID, UUID, INTEGER, INTEGER, JSONB, BOOLEAN
) TO service_role;

REVOKE ALL ON FUNCTION public.get_program_speaker_count() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_program_speaker_count() TO service_role;

COMMIT;
