# Agents

This repository's AI agent guidance lives in `CLAUDE.md` (canonical) and scoped
`CLAUDE.md` files in subdirectories. This file exists for tools that look up
`AGENTS.md` (Codex, Aider, Cline, etc.) — they all point to the same rulebook.

Start here: [CLAUDE.md](./CLAUDE.md)

Scoped guidance is in nested `CLAUDE.md` files. Find them with:

```bash
find . -name CLAUDE.md -not -path '*/node_modules/*'
```

Key conventions in 30 seconds:

- **pnpm 11**, **Node 22**, **oxlint** (not eslint), **Vitest**, **Pages Router**.
- `@/*` → `src/*` for imports.
- API routes: pick the right auth (`createSupabaseApiClient` / `verifyAdminAccess` / `createServiceRoleClient`).
- Validate inputs with **Zod**; log with **`logger.scope()`**; never `console.log`.
- `src/lib/types/database.generated.ts` is **generated** — never hand-edit.
- Pre-commit runs full tests + typecheck + build. Don't `--no-verify`.

See `CLAUDE.md` for the full guide.
