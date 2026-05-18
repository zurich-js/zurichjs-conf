---
description: Scaffold a new Supabase migration with timestamp + RLS template
argument-hint: <short_snake_case_description>
---

Scaffold a new SQL migration in `supabase/migrations/`.

Naming: `YYYYMMDDHHMMSS_$ARGUMENTS.sql` (UTC, 14 digits). The timestamp must be strictly greater
than the lexicographically greatest existing filename in `supabase/migrations/`. Compute it like
this:

```bash
LATEST="$(ls supabase/migrations/ | sort | tail -1 | cut -d_ -f1)"
NOW="$(date -u +%Y%m%d%H%M%S)"
TS="$NOW"
# If NOW <= LATEST (clock skew, rapid migrations), bump to LATEST + 1 second.
if [[ "$TS" -le "$LATEST" ]]; then
  TS="$(date -u -d "@$(( $(date -u -d "${LATEST:0:4}-${LATEST:4:2}-${LATEST:6:2} ${LATEST:8:2}:${LATEST:10:2}:${LATEST:12:2} UTC" +%s) + 1 ))" +%Y%m%d%H%M%S)"
fi
FILE="supabase/migrations/${TS}_$ARGUMENTS.sql"
```

Always use `date -u` (UTC). Never use the local clock.

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
