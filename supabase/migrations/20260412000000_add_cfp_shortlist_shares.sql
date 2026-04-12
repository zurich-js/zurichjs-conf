-- CFP Shortlist Shares
-- Secure, token-based sharing of individual submissions with reviewers.
-- Admins generate a unique link per submission; authenticated reviewers
-- can open the link to see the full (de-anonymized) submission details.

CREATE TABLE IF NOT EXISTS cfp_shortlist_shares (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id uuid NOT NULL REFERENCES cfp_submissions(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  created_by text NOT NULL,              -- admin identifier (email or name)
  note text,                              -- optional context for the reviewer
  expires_at timestamptz,                 -- NULL = never expires
  revoked_at timestamptz,                 -- NULL = active
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Fast lookup by token (primary access pattern)
CREATE UNIQUE INDEX idx_cfp_shortlist_shares_token ON cfp_shortlist_shares (token);

-- Find all shares for a submission
CREATE INDEX idx_cfp_shortlist_shares_submission ON cfp_shortlist_shares (submission_id);

-- Enable RLS
ALTER TABLE cfp_shortlist_shares ENABLE ROW LEVEL SECURITY;

-- Revoke default access
REVOKE ALL ON cfp_shortlist_shares FROM anon, authenticated;

-- Grant access to authenticated users (read-only for reviewers via token lookup)
GRANT SELECT ON cfp_shortlist_shares TO authenticated;

-- Service role has full access (used by admin API routes)
