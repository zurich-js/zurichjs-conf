-- Close the volunteer tables to client roles.
--
-- 20260509000000_add_volunteer_tables.sql created volunteer_roles,
-- volunteer_applications and volunteer_profiles and never enabled row level
-- security on any of them, nor managed their grants. Combined with Supabase's
-- default privileges, that left all three fully open to the anon role:
--
--   table                  | rls | policies | select | insert | update | delete
--   volunteer_applications |  f  |    0     |   t    |   t    |   t    |   t
--   volunteer_profiles     |  f  |    0     |   t    |   t    |   t    |   t
--   volunteer_roles        |  f  |    0     |   t    |   t    |   t    |   t
--
-- The publishable key ships in the client bundle by design
-- (src/config/env.ts:45-47), so anyone could read every volunteer's first and
-- last name, email, phone number, LinkedIn URL, application motivation text and
-- internal notes -- and also modify or delete all of it. This is a violation of
-- cardinal rule 2 in supabase/migrations/CLAUDE.md ("New tables must enable RLS
-- in the same migration").
--
-- Nothing in the application reads or writes these tables. A repo-wide grep for
-- all three names outside src/lib/types/ returns no hits: src/pages/volunteer.tsx
-- is static content, and applications are collected by a Google Form rather than
-- written to Postgres. So closing them to client roles cannot break a caller --
-- there are none.
--
-- Deny-by-default is therefore the right posture: RLS on with no policies for
-- anon or authenticated, and service_role for the admin surface that will
-- eventually manage the crew. If a dynamic volunteer page is built later, the
-- policy it needs is written out at the bottom of this file, commented, so it is
-- a deliberate one-line change rather than a rediscovery.

BEGIN;

-- ============================================
-- volunteer_roles -- public job postings
-- ============================================

ALTER TABLE public.volunteer_roles ENABLE ROW LEVEL SECURITY;

-- Reset grants declaratively so the outcome does not depend on prior state.
REVOKE ALL ON TABLE public.volunteer_roles FROM anon;
REVOKE ALL ON TABLE public.volunteer_roles FROM authenticated;
GRANT ALL ON TABLE public.volunteer_roles TO service_role;

-- ============================================
-- volunteer_applications -- submitted applications
-- ============================================

ALTER TABLE public.volunteer_applications ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.volunteer_applications FROM anon;
REVOKE ALL ON TABLE public.volunteer_applications FROM authenticated;
GRANT ALL ON TABLE public.volunteer_applications TO service_role;

-- ============================================
-- volunteer_profiles -- crew records
-- ============================================

ALTER TABLE public.volunteer_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.volunteer_profiles FROM anon;
REVOKE ALL ON TABLE public.volunteer_profiles FROM authenticated;
GRANT ALL ON TABLE public.volunteer_profiles TO service_role;

-- ============================================
-- If a dynamic volunteer page is built later
-- ============================================
--
-- These tables carry is_public / status / show_spots_publicly columns, so the
-- original intent was clearly a public listing. Rendering one does NOT require
-- reopening the tables: the page can be served through an API route on the
-- service-role client with an explicit column projection, which is how every
-- other public listing in this repo works and which keeps email, phone and
-- internal_contact off the wire entirely.
--
-- If direct anon reads are wanted instead, these are the narrowest policies
-- that would do it. Note that a policy alone is not enough -- the matching
-- column-scoped GRANT is what stops the PII columns coming along with the row,
-- because RLS filters rows and privileges filter columns.
--
--   GRANT SELECT (id, title, slug, summary, description, responsibilities,
--                 requirements, benefits, commitment_type, location_context,
--                 spots_available, show_spots_publicly, sort_order)
--     ON TABLE public.volunteer_roles TO anon;
--   CREATE POLICY "volunteer_roles_public_read"
--     ON public.volunteer_roles FOR SELECT TO anon
--     USING (is_public IS TRUE AND status = 'published');
--
--   GRANT SELECT (id, first_name, last_name, public_bio, photo_url, role_id)
--     ON TABLE public.volunteer_profiles TO anon;
--   CREATE POLICY "volunteer_profiles_public_read"
--     ON public.volunteer_profiles FOR SELECT TO anon
--     USING (is_public IS TRUE);
--
-- volunteer_applications should never be readable by a client role: every row
-- is an identifiable person's submission, including free-text motivation and
-- internal reviewer notes.
--
-- Worth noting for whoever builds the door staff panel: volunteer_roles
-- already constrains commitment_type to workshop_day | conference_day |
-- both_days | pre_event | remote | flexible, which is the same vocabulary the
-- door occasions use. These tables remain recruitment content and are NOT an
-- authorization foundation -- they have no user_id column -- but the shift
-- vocabulary is worth reusing rather than reinventing.

COMMIT;
