---
description: Regenerate src/lib/types/database.generated.ts from Supabase
---

Regenerate the Supabase type definitions:

```bash
scripts/regen-db-types.sh
```

This overwrites `src/lib/types/database.generated.ts`. Never hand-edit that file directly.

After regenerating:

1. Run `pnpm typecheck` to see what (if anything) broke from schema drift.
2. Commit the regenerated file as part of the migration that prompted it.
