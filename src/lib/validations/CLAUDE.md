# Validations — `src/lib/validations/`

Zod schemas. Every API route input must be validated through here.

## Files

| File | Validates |
|---|---|
| `cfp.ts` | Submissions, speaker profiles, reviews, travel forms |
| `checkout.ts` | Cart items, checkout payloads |
| `issue-report.ts` | Bug-report submissions |
| `__tests__/social-handles.test.ts` | Social handle normalization edge cases |

## Usage in API routes

```typescript
import { submissionSchema } from '@/lib/validations/cfp';

const result = submissionSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({
    error: 'Validation failed',
    issues: result.error.issues,
  });
}
const data = result.data;  // fully typed
```

Always `safeParse` — never `parse` (throws an unhandled exception). The `issues`
array gives the client per-field error info.

## Composition

Compose with `.extend()`, `.merge()`, `.pick()`, `.omit()`. A common pattern is to
define a `baseSubmissionSchema` and extend it for create vs update flows:

```typescript
const createSchema = baseSubmissionSchema;
const updateSchema = baseSubmissionSchema.partial();
```

## Helpers

`cfp.ts` exports reusable helpers — reuse them rather than rolling new ones:

- `normalizeHandle(value)` — strips `@`, social URL prefixes, mastodon URLs.
- `wordCount(text)` — counts words for length validation (CFP enforces word limits
  on abstracts).
- `TSHIRT_SIZES`, `ASSISTANCE_TYPES`, `TRAVEL_OPTIONS` — shared `as const` literal arrays.

## Schema-driven types

Prefer deriving TypeScript types from Zod schemas when possible:

```typescript
export type Submission = z.infer<typeof submissionSchema>;
```

This keeps types and runtime validation in sync. Don't hand-write a `Submission`
interface that duplicates the schema shape.

## Don'ts

- Don't bypass validation because the data "is coming from our admin UI" — admin
  users make typos too, and the API may be hit by bots.
- Don't `.passthrough()` on user-supplied objects — unexpected keys are usually
  bugs or attacks. Use `.strict()` or default `.strip()`.
- Don't put schemas inline in API handlers if they're reusable; centralize here.
