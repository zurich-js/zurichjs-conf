# Migrations — `supabase/migrations/`

Timestamped SQL files applied by `supabase db push`. 60+ files today; the order is
strict and the history is immutable.

## Naming

```
YYYYMMDDHHMMSS_short_snake_case_description.sql
```

- 14-digit UTC timestamp.
- Underscore separator.
- Lowercase snake_case description.
- New filenames must sort **strictly after** every existing file.

Use the scaffold:

```bash
/migrate-new add_speaker_pronouns
```

## Cardinal rules

1. **Never edit a migration once it's been merged to `main`.** It's already been
   applied to staging/prod. Edits silently drift production from the SQL history.
   Always write a follow-up migration instead.
2. **New tables must enable RLS** in the same migration. Service-role bypass is
   the safety net, but RLS is the gate for everything else.
3. **Wrap multi-statement migrations in `BEGIN; ... COMMIT;` explicitly.** The
   Supabase CLI does NOT automatically wrap each migration file in a single
   transaction, so without `BEGIN`/`COMMIT` a partial failure leaves the schema
   half-applied. Wrap every multi-statement migration unless you're using one of
   the statements below that can't run in a transaction:
   - `CREATE INDEX CONCURRENTLY` / `DROP INDEX CONCURRENTLY`
   - `ALTER TYPE ... ADD VALUE` (in some Postgres versions)
   - `VACUUM`, `REINDEX`, `CLUSTER`
   - `CREATE DATABASE` / `DROP DATABASE`

   When you need one of these, put it in its own migration file (no `BEGIN`/`COMMIT`)
   so a failure doesn't leave an unrelated transaction half-applied.
4. **Idempotent where possible.** Use `IF NOT EXISTS`, `IF EXISTS`, and
   `CREATE OR REPLACE` so re-running is safe.

## RLS pattern

```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- Users can read their own rows
CREATE POLICY "users_read_own"
  ON my_table FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own rows
CREATE POLICY "users_insert_own"
  ON my_table FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role bypasses RLS automatically — used by webhooks + admin
```

Common patterns from existing migrations:
- Per-user ownership: `auth.uid() = user_id`
- Admin via role: `EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')`
- Public reads: `USING (true)` — only on intentionally public tables (sponsors, public speakers)

## Storage buckets

Storage policies live in their own migrations (look for `*_storage.sql` —
`qrcode_storage`, `b2b_invoices_storage`, `sponsorship_storage`,
`travel_invoices_storage`). Pattern: create the bucket, set its public flag, then
add `storage.objects` policies for reads/writes.

## After applying a migration

1. Run `scripts/regen-db-types.sh` (or `/regen-db-types`) to refresh
   `src/lib/types/database.generated.ts`.
2. Run `pnpm typecheck` to surface anything broken by the schema change.
3. Commit the regenerated types in the same PR as the migration.

## Seeding

Phase-based seeds live in `supabase/seeds/` (with a README). Run with:

```bash
pnpm db:seed:cfp-first-stage      # reviewer workload
pnpm db:seed:cfp-admission        # admission decisions phase
pnpm db:seed:cfp-schedule         # scheduling phase
pnpm db:seed:workshop-commerce    # workshop registration data
```

Wrapped by `scripts/seed-supabase-phase.sh`. Run against a local Supabase
container — never against production.

## Don'ts

- Don't drop production tables in a migration unless absolutely necessary; rename
  + deprecate first.
- Don't include data backfill in DDL migrations on large tables — write a
  separate, idempotent backfill script.
- Don't skip RLS because "the table is internal" — RLS is on by default, not
  optional.
- Don't pick a timestamp earlier than `HEAD`'s most-recent migration.
