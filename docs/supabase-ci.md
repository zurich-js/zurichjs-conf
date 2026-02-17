# Supabase Migration CI Checks

## Overview

The `supabase-migrations` CI job validates migration files on every push and PR without requiring a running Supabase instance. This catches migration issues before they reach production.

## What It Checks

### 1. Migration File Ordering

Verifies all files in `supabase/migrations/` follow the naming convention and are in chronological order.

**Expected format**: `YYYYMMDDHHMMSS_description.sql`

**Catches**:
- Files without a 14-digit timestamp prefix
- Out-of-order timestamps (migration added between existing ones)
- Non-standard file naming

**Example failure**:
```
ERROR: Migration files are out of order!
  20260216100000_add_cfp_emails.sql (20260216100000) should come before
  20260215000000_late_addition.sql (20260215000000)
```

### 2. Destructive Operation Detection (PRs only)

Scans new/changed migration files for potentially dangerous SQL operations.

**Detects**:
- `DROP TABLE`
- `DROP COLUMN` / `ALTER TABLE ... DROP`
- `TRUNCATE`

**Behavior**: Warns but does not fail. The reviewer must assess whether the destructive change is intentional. This is a best-effort check to surface risky changes in PR review.

### 3. Basic SQL Validation

Runs lightweight checks on all migration files.

**Checks**:
- Unmatched parentheses (common copy-paste error)
- Empty migration files

**Behavior**: Fails the job if issues are found.

## What It Does NOT Check

These require a running database and are not currently automated:

- **SQL syntax correctness** — Only basic structural checks, not full SQL parsing
- **Schema drift** — No comparison between migration state and production
- **Data integrity** — No checks for data migration correctness
- **RLS policy correctness** — Policies are syntax-checked but not semantically validated

## Future Improvements

### Supabase CLI Integration

When the project is ready, the CI job can be extended to:

1. Install Supabase CLI
2. Start a local Supabase instance
3. Apply all migrations
4. Validate the resulting schema

This requires adding `supabase/cli` to CI and would catch actual SQL errors.

```yaml
# Future: Full migration validation
- name: Setup Supabase CLI
  uses: supabase/setup-cli@v1

- name: Start Supabase
  run: supabase start

- name: Apply migrations
  run: supabase db push

- name: Validate schema
  run: supabase db diff --linked
```

### Production Schema Comparison

For drift detection against production:

1. Store a `SUPABASE_DB_URL` secret (read-only connection string) in GitHub
2. Run `supabase db diff` to compare migration state vs production schema
3. Fail if unexpected differences are found

**Security note**: Use a read-only connection string. Never store write credentials in CI.

### Migration Linting

SQL linting tools like `sqlfluff` or `squawk` could enforce:
- Consistent SQL formatting
- Safe migration patterns (e.g., `ADD COLUMN ... DEFAULT` instead of backfilling)
- No locking operations on large tables

## Local Development

### Creating a new migration

```bash
# Create a new migration file with timestamp
supabase migration new description_of_change
```

### Applying migrations locally

```bash
supabase start
supabase db push
```

### Checking migration status

```bash
supabase migration list
```

## Secrets Required

Currently: **None** — all checks are file-based and don't need database access.

Future (for schema comparison):
- `SUPABASE_DB_URL` — Read-only PostgreSQL connection string to production
- `SUPABASE_ACCESS_TOKEN` — Supabase management API token (optional)
