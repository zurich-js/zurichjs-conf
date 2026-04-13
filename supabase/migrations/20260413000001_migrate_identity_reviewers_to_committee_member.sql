UPDATE cfp_reviewers
SET
  role = 'committee_member',
  can_see_speaker_identity = false,
  updated_at = NOW()
WHERE role = 'reviewer'
  AND can_see_speaker_identity = true
  AND is_active = true;

COMMENT ON COLUMN cfp_reviewers.can_see_speaker_identity IS 'Legacy column. Reviewer visibility is now inferred from role.';
