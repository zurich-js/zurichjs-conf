# Consolidation Plan

## Findings

### Duplication Hotspots

| Pattern | Files Affected | Severity |
|---------|---------------|----------|
| Error response boilerplate (`res.status(N).json({ error: '...' })`) | ~100 API routes | High |
| Admin token verification (3-line check) | ~40 admin routes | High |
| CFP speaker auth sequence (Supabase session + speaker lookup) | ~18 CFP routes | Medium |
| Inline Zod schemas in API routes | 8-10 routes | Medium |
| Method checking + 405 fallback | ~76 routes | Medium |

### What Was Implemented

#### 1. API Response Helpers (`src/lib/api/responses.ts`) — NEW

Created standardized response helper functions that replace the most repeated patterns:

```typescript
// Before (repeated ~600 times across 102 files):
return res.status(401).json({ error: 'Unauthorized' });
return res.status(400).json({ error: 'Validation failed', issues: result.error.issues });
return res.status(405).json({ error: 'Method not allowed' });
return res.status(500).json({ error: 'Internal server error' });

// After:
return apiUnauthorized(res);
return apiValidationError(res, result.error);
return apiMethodNotAllowed(res);
return apiServerError(res);
```

**Functions provided**:
- `apiError(res, status, message)` — generic error with any status
- `apiValidationError(res, zodError)` — 400 with Zod issues
- `apiMethodNotAllowed(res)` — 405
- `apiUnauthorized(res)` — 401
- `apiServerError(res)` — 500

**Benefits**:
- Consistent response shape across all routes (type-checked via `satisfies ApiErrorResponse`)
- Single place to change error format if needed (e.g., adding request IDs, error codes)
- Reduces ~5 lines to 1 line per error response
- Exported from `@/lib/api` barrel

**Test coverage**: `src/lib/api/__tests__/responses.test.ts` — 5 tests

#### 2. Migrated Example Routes

Migrated 2 representative routes to demonstrate the pattern:

- `src/pages/api/admin/cfp/speakers.ts` — admin route with token verification
- `src/pages/api/cfp/speaker/index.ts` — CFP route with Supabase auth

These serve as reference implementations for migrating remaining routes.

### What Was NOT Implemented (and why)

#### Admin Auth Middleware Wrapper

A wrapper like `withAdminAuth(handler)` would eliminate the 3-line token check from ~40 routes. However, this changes the function signature pattern and would be a larger refactor touching many files. The response helpers provide most of the value with less risk.

**Recommendation**: Implement as a follow-up PR. The wrapper would look like:
```typescript
export function withAdminAuth(handler: AdminHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = req.cookies.admin_token;
    if (!verifyAdminToken(token)) return apiUnauthorized(res);
    return handler(req, res);
  };
}
```

#### CFP Speaker Auth Wrapper

Same approach as admin auth — wrap the Supabase session + speaker lookup into a reusable function. Deferred for the same reason.

#### Inline Schema Centralization

~8-10 partnership/sponsorship routes have inline Zod schemas that should move to `src/lib/validations/partnerships.ts`. This is mechanical work that doesn't reduce risk, so it's lower priority.

### Migration Guide for Remaining Routes

To migrate an existing API route to use the response helpers:

1. Add import:
   ```typescript
   import { apiUnauthorized, apiValidationError, apiServerError, apiMethodNotAllowed } from '@/lib/api/responses';
   ```

2. Replace error patterns:
   - `res.status(401).json({ error: 'Unauthorized' })` → `apiUnauthorized(res)`
   - `res.status(400).json({ error: 'Validation failed', issues: result.error.issues })` → `apiValidationError(res, result.error)`
   - `res.status(500).json({ error: 'Internal server error' })` → `apiServerError(res)`
   - `res.status(405).json({ error: 'Method not allowed' })` → `apiMethodNotAllowed(res)`
   - Any other: `apiError(res, statusCode, 'message')`

3. Remove inline error response objects

Remaining routes can be migrated incrementally — no big-bang required.
