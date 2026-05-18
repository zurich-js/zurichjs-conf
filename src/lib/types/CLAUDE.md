# Types — `src/lib/types/`

The home for all domain types. **Never add new types to `src/types/`** (the
top-level 3-file directory is legacy and being phased out).

## Generated DB types

`database.generated.ts` (3000+ lines) is auto-generated from the Supabase schema.

- **Never hand-edit it.** Edits are overwritten by `scripts/regen-db-types.sh`.
- Regenerate after every applied migration. Commit the regenerated file with the
  migration that prompted it.
- The wrapper file `database.ts` re-exports the `Database` type — import that,
  not the raw generated file.

## Organized subdirectories (preferred)

| Subdir | Contains |
|---|---|
| `cfp/` | Split into `base`, `entities`, `reviews`, `decisions`, `travel`, `admin`, `public`, `config`, `requests`, `index` |
| `sponsorship/` | Split into `base`, `database`, `api`, `invoice`, `status`, `composite`, `public`, `index` |

Import from the subdirectory:

```typescript
import type { CfpSubmissionStatus } from '@/lib/types/cfp';   // ← uses index.ts barrel
import type { CfpAdminSubmission } from '@/lib/types/cfp/admin';
```

## Legacy aggregated files (being migrated)

These exist for backward compatibility but should not receive new types:

- `cfp.ts`, `cfp-admin.ts`, `cfp-database.ts`, `cfp-analytics.ts` — migrate to `cfp/`
- `sponsor-quote.ts` — could move into `sponsorship/`

When you touch consumers of these legacy files, prefer migrating their imports to
the organized subdirectory. Don't add new exports here.

## Other domain types

Single-file domains: `b2b.ts`, `b2b-quote.ts`, `partnership.ts`, `program.ts`,
`program-schedule.ts`, `vip-perks.ts`, `ticket-constants.ts`, `ticket-upgrade.ts`,
`ticket-invoice.ts`.

When a single file passes ~300 lines or gains more than 3-4 distinct concepts,
split it into a subdirectory following the `cfp/` / `sponsorship/` template.

## Naming

- **Types** (unions, intersections, primitives): `type` keyword. PascalCase.
  `type CfpSubmissionStatus = 'draft' | 'submitted' | ...`
- **Object shapes** (records, props, entities): `interface`. PascalCase. Use for
  anything that might be extended.
- **Const arrays** for enum-like values: `as const`, with a `typeof` derivation:
  ```typescript
  export const TSHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;
  export type TshirtSize = typeof TSHIRT_SIZES[number];
  ```

## Importing the database type

```typescript
import type { Database } from '@/lib/types/database';

// Row of a specific table
type SubmissionRow = Database['public']['Tables']['cfp_submissions']['Row'];

// Insert shape
type SubmissionInsert = Database['public']['Tables']['cfp_submissions']['Insert'];
```

## Don'ts

- Don't redefine row shapes that exist in `database.generated.ts`. Derive from `Database`.
- Don't add to `src/types/` — old location, 3 files left (`cart.ts`, `stripe.ts`,
  `lz-string.d.ts`).
- Don't use `any` to bridge type gaps. Use `unknown` + a type guard, or fix the
  upstream type.
- Don't put types in component files unless they're component-local
  (`ButtonProps` belongs next to `Button`).
