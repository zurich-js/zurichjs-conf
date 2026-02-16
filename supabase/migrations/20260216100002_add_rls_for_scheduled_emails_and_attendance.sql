-- Enable RLS for CFP tables that were missing RLS
-- cfp_reviewers and cfp_reviews were added in 20250205000000
-- cfp_decision_events was added in 20260216000000
-- cfp_scheduled_emails and cfp_speaker_attendance were added in 20260216100000

-- ============================================
-- REVOKE ANON PERMISSIONS
-- ============================================

-- cfp_reviewers (reviewer access via authenticated role)
REVOKE ALL ON TABLE "public"."cfp_reviewers" FROM "anon";

-- cfp_reviews (reviewer access via authenticated role)
REVOKE ALL ON TABLE "public"."cfp_reviews" FROM "anon";

-- cfp_decision_events (admin only - no anon access)
REVOKE ALL ON TABLE "public"."cfp_decision_events" FROM "anon";

-- cfp_scheduled_emails (admin only - no anon access)
REVOKE ALL ON TABLE "public"."cfp_scheduled_emails" FROM "anon";

-- cfp_speaker_attendance (speakers access via authenticated role)
REVOKE ALL ON TABLE "public"."cfp_speaker_attendance" FROM "anon";

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE "public"."cfp_reviewers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cfp_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cfp_decision_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cfp_scheduled_emails" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cfp_speaker_attendance" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES FOR cfp_reviewers
-- ============================================

-- Reviewers can read their own profile
CREATE POLICY "cfp_reviewers_select_own"
  ON "public"."cfp_reviewers"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated, authenticator
  USING (user_id = auth.uid());

-- Reviewers can update their own profile
CREATE POLICY "cfp_reviewers_update_own"
  ON "public"."cfp_reviewers"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated, authenticator
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- POLICIES FOR cfp_reviews
-- ============================================

-- Reviewers can read their own reviews
CREATE POLICY "cfp_reviews_select_own"
  ON "public"."cfp_reviews"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated, authenticator
  USING (
    reviewer_id IN (
      SELECT id FROM cfp_reviewers WHERE user_id = auth.uid()
    )
  );

-- Reviewers can insert their own reviews
CREATE POLICY "cfp_reviews_insert_own"
  ON "public"."cfp_reviews"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated, authenticator
  WITH CHECK (
    reviewer_id IN (
      SELECT id FROM cfp_reviewers WHERE user_id = auth.uid()
    )
  );

-- Reviewers can update their own reviews
CREATE POLICY "cfp_reviews_update_own"
  ON "public"."cfp_reviews"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated, authenticator
  USING (
    reviewer_id IN (
      SELECT id FROM cfp_reviewers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    reviewer_id IN (
      SELECT id FROM cfp_reviewers WHERE user_id = auth.uid()
    )
  );

-- Reviewers can delete their own reviews
CREATE POLICY "cfp_reviews_delete_own"
  ON "public"."cfp_reviews"
  AS PERMISSIVE
  FOR DELETE
  TO authenticated, authenticator
  USING (
    reviewer_id IN (
      SELECT id FROM cfp_reviewers WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- POLICIES FOR cfp_decision_events
-- ============================================

-- This table is admin-only audit log, accessed via service role key
-- No policies needed for authenticated users as they don't access this directly
-- The service role bypasses RLS

-- ============================================
-- POLICIES FOR cfp_scheduled_emails
-- ============================================

-- This table is admin-only, accessed via service role key
-- No policies needed for authenticated users as they don't access this directly
-- The service role bypasses RLS

-- ============================================
-- POLICIES FOR cfp_speaker_attendance
-- ============================================

-- Speakers can read their own attendance records
CREATE POLICY "cfp_speaker_attendance_select_own"
  ON "public"."cfp_speaker_attendance"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated, authenticator
  USING (
    speaker_id IN (
      SELECT id FROM cfp_speakers WHERE user_id = auth.uid()
    )
  );

-- Speakers can update their own attendance (confirm/decline)
CREATE POLICY "cfp_speaker_attendance_update_own"
  ON "public"."cfp_speaker_attendance"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated, authenticator
  USING (
    speaker_id IN (
      SELECT id FROM cfp_speakers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    speaker_id IN (
      SELECT id FROM cfp_speakers WHERE user_id = auth.uid()
    )
  );

-- Speakers can insert their own attendance records (for dashboard-based confirmation)
CREATE POLICY "cfp_speaker_attendance_insert_own"
  ON "public"."cfp_speaker_attendance"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated, authenticator
  WITH CHECK (
    speaker_id IN (
      SELECT id FROM cfp_speakers WHERE user_id = auth.uid()
    )
  );
