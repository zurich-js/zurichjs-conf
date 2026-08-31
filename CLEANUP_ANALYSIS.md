# ZurichJS Conference Codebase Cleanup Analysis

**Generated:** 2026-08-31  
**Tool:** Knip 6.33.0 + Manual Analysis

---

## Executive Summary

This analysis identifies dead code, duplication, and inconsistencies in the ZurichJS codebase. The codebase is generally well-structured with comprehensive AI agent documentation (17 CLAUDE.md files), but has accumulated ~32 unused files, ~571 unused exports, and 3-5 genuinely unused dependencies.

---

## 1. Dead Code Analysis (Knip Results)

### Unused Files (32 total)

#### High-Confidence Dead Code (Safe to Remove)

| File | Reason |
|------|--------|
| `src/lib/roles/` (3 files) | Complete module never integrated - no imports anywhere |
| `src/hooks/useFeatureFlags.ts` | Not imported anywhere |
| `src/hooks/useTabs.ts` | Not imported anywhere |
| `src/lib/types/cfp-database.ts` | Legacy type file, replaced by `src/lib/types/cfp/` |
| `src/types/stripe.ts` | Legacy location, types likely moved |
| `src/lib/api/examples.ts` | Example file, not production code |
| `src/components/atoms/ValueIcon.tsx` | No imports found |
| `src/components/cfp/Skeleton.tsx` | No imports found |

#### Potentially Dead (Verify Before Removing)

| File | Notes |
|------|-------|
| `src/components/admin/B2BOrdersTab.tsx` | May be feature-flagged or WIP |
| `src/components/admin/workshops/*` (9 files) | Entire workshops admin suite - verify if feature is deployed |
| `src/components/molecules/SponsorCtaCard.tsx` | May be used in CMS or dynamic content |
| `src/lib/og/runtime-edge.ts` | May be used by edge runtime |
| `src/lib/analytics/server-helpers.ts` | Check if used in SSR |

#### Barrel Files (Not Actually Dead)

These index.ts files are flagged but are actually re-exports:
- `src/emails/index.ts`
- `src/emails/templates/index.ts`
- `src/emails/examples/index.ts`
- `src/hooks/index.ts`
- `src/lib/stripe/index.ts`
- `src/components/workshops/index.ts`

### Unused Dependencies

| Package | Status | Action |
|---------|--------|--------|
| `class-variance-authority` | Definitely unused | Remove |
| `use-local-storage-state` | Definitely unused (replaced by `usehooks-ts`) | Remove |
| `styled-jsx` | Definitely unused | Remove |
| `react-dom` | **False positive** - used implicitly by Next.js | Keep |

### Unused Exports (571 total)

Most are from barrel index.ts files that Knip can't trace. However, significant patterns emerge:

1. **Over-exported admin components** - Many admin UI components are exported from index.ts but only used internally
2. **Over-exported utility functions** - Many helper functions exported "just in case"
3. **Duplicate exports** - Same function exported from implementation file AND barrel file

---

## 2. Duplication Patterns

### Component Duplication

| Pattern | Files | Recommendation |
|---------|-------|----------------|
| Multiple `StatusBadge` components | `admin/cfp/`, `admin/sponsorships/`, etc. | Consolidate into `atoms/StatusBadge` with variants |
| Multiple `StatsCards` components | `admin/vip-perks/`, `admin/sponsorships/`, `admin/speaker-logistics/` | Create generic `StatsCards` organism |
| Multiple modal patterns | Various `*Modal.tsx` files | Extract `ModalBase` with consistent layout |
| Multiple form field patterns | `FormField` in different directories | Standardize on `molecules/FormField` |

### Hook Duplication

| Pattern | Locations | Recommendation |
|---------|-----------|----------------|
| Query key factories | Scattered across hooks | Centralize in `src/lib/queries/` |
| Similar CRUD hooks | `cfp/`, admin hooks | Extract `createCrudHooks` factory |
| Feature flag checking | Various hooks | Use single `useFeatureFlag` hook |

### Logic Duplication

| Pattern | Locations | Recommendation |
|---------|-----------|----------------|
| Date formatting | `utils.ts` in multiple directories | Centralize in `@/lib/date` |
| Price formatting | `cart.ts`, `checkout/`, `tickets/` | Centralize in `@/lib/format` |
| Currency handling | Multiple files | Already centralized in `@/config/currency` - ensure usage |

---

## 3. Architectural Concerns

### Separation of Concerns Issues

1. **Components doing data fetching** - Some organisms fetch data internally (violates Atomic Design)
2. **Business logic in components** - Price calculations in checkout components should be in lib/
3. **Mixed admin/public code** - Some admin utilities in generic locations

### Module Organization

| Issue | Location | Recommendation |
|-------|----------|----------------|
| 37 subdirectories in `src/lib/` | `src/lib/` | Group related modules (e.g., `lib/payment/` for stripe + cart + checkout) |
| `src/lib/roles/` unused | `src/lib/roles/` | Remove or integrate |
| Legacy type files | `src/lib/types/cfp.ts`, `cfp-admin.ts` | Remove after ensuring all imports use `src/lib/types/cfp/` |

### File Size Violations

Files exceeding 500-line guideline (from CLAUDE.md):

| File | Lines | Status |
|------|-------|--------|
| `src/components/admin/workshops/WorkshopAdminModal.tsx` | 903 | Marked for refactor |
| `pages/sponsor-quote.tsx` | 675 | Marked for refactor |
| `pages/cfp/submissions/[id]/index.tsx` | 655 | Marked for refactor |
| Various admin modals | 500-700 | Should split on next touch |

---

## 4. AI Agent Documentation Review

### Existing CLAUDE.md Files (17 total)

| File | Quality | Notes |
|------|---------|-------|
| `/CLAUDE.md` | Excellent | Comprehensive, up-to-date |
| `/src/pages/api/CLAUDE.md` | Excellent | Clear auth patterns |
| `/src/lib/cfp/CLAUDE.md` | Excellent | Good state machine docs |
| `/src/lib/stripe/CLAUDE.md` | Excellent | Clear webhook guidance |
| `/src/components/CLAUDE.md` | Good | Could add more examples |
| `/src/hooks/CLAUDE.md` | Good | Missing query key pattern details |
| Others | Good | Appropriate scoping |

### Documentation Gaps

1. **Missing CLAUDE.md files:**
   - `src/config/` - pricing stages, env config need documentation
   - `src/lib/api/` - client patterns not documented
   - `src/lib/cart/` - cart operations need documentation
   - `src/lib/discount/` - complex discount logic needs docs

2. **Improvements to existing docs:**
   - Add dead code patterns to anti-patterns section
   - Document Knip configuration
   - Add module consolidation guidelines

---

## 5. Recommended Actions

### Immediate (Low Risk)

1. **Remove unused dependencies:**
   ```bash
   pnpm remove class-variance-authority use-local-storage-state styled-jsx
   ```

2. **Remove confirmed dead code:**
   - `src/lib/roles/` (entire directory)
   - `src/hooks/useFeatureFlags.ts`
   - `src/hooks/useTabs.ts`
   - `src/lib/types/cfp-database.ts`
   - `src/types/stripe.ts`
   - `src/lib/api/examples.ts`
   - `src/components/atoms/ValueIcon.tsx`

3. **Add Knip configuration** (already created: `/workspace/knip.json`)

### Short-term (Medium Risk)

1. **Verify and remove workshop admin components** if feature is not deployed
2. **Consolidate StatusBadge components** into generic atom
3. **Consolidate StatsCards components** into generic organism
4. **Add missing CLAUDE.md files** for `config/`, `api/`, `cart/`, `discount/`

### Long-term (Requires Planning)

1. **Reorganize `src/lib/`** - group related modules
2. **Extract modal base patterns** - reduce duplication
3. **Create CRUD hook factory** - standardize data fetching patterns
4. **Split oversized files** - workshops admin modal, sponsor-quote page

---

## 6. Knip Configuration

Created `/workspace/knip.json` to improve dead code detection accuracy:

```json
{
  "$schema": "https://unpkg.com/knip@6/schema.json",
  "entry": ["src/pages/**/*.{ts,tsx}", "src/pages/api/**/*.ts"],
  "project": ["src/**/*.{ts,tsx}", "scripts/**/*.ts"],
  "ignore": ["**/__tests__/**", "**/*.test.{ts,tsx}", "**/*.d.ts"],
  ...
}
```

Run with: `npx knip`

---

## 7. Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Unused files | 32 | 0 |
| Unused dependencies | 3-5 | 0 |
| Unused exports | 571 | <50 (true duplication) |
| Missing CLAUDE.md | 4 directories | 0 |
| File size violations | ~10 | 0 |

---

## Appendix: Commands

```bash
# Run Knip analysis
npx knip

# Check specific file usage
grep -r "from '@/hooks/useFeatureFlags'" src/

# Find large files
find src -name "*.tsx" -exec wc -l {} + | sort -n | tail -20

# Find duplicate component names
find src/components -name "*.tsx" -exec basename {} \; | sort | uniq -d
```
