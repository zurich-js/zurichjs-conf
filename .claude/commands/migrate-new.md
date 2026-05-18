---
description: Scaffold a new Supabase migration with timestamp + RLS template
argument-hint: <short_snake_case_description>
---

Scaffold a new SQL migration in `supabase/migrations/`.

Naming: `YYYYMMDDHHMMSS_$ARGUMENTS.sql` (UTC). The timestamp must be greater than every existing
file in `supabase/migrations/` — read the most recent file there and pick a strictly later UTC
timestamp.

Template the file with:

```sql
-- Migration: $ARGUMENTS
-- TODO: describe what this changes and why.

BEGIN;

-- 1. Schema changes
-- CREATE TABLE / ALTER TABLE ... here.

-- 2. Indexes
-- CREATE INDEX IF NOT EXISTS ...

-- 3. RLS — REQUIRED for any new table
-- ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "<name>" ON <table>
--   FOR SELECT USING (auth.uid() = user_id);
--
-- Service role bypasses RLS automatically — webhook + admin code uses that.

COMMIT;
```

After creating the file:

1. Print the path.
2. Remind the user that `database.generated.ts` needs regenerating via `scripts/regen-db-types.sh` once the migration is applied.
3. Do NOT apply the migration automatically.

See `supabase/migrations/CLAUDE.md` for full conventions.
