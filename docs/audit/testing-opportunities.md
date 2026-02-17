# Testing Opportunities — Risk Audit

## Current Coverage

5 test suites exist covering ~30% of critical business logic:

| Suite | File | Coverage |
|-------|------|----------|
| CFP Scoring | `src/lib/cfp/__tests__/scoring.test.ts` | Score computation, bucketing, formatting |
| CFP Decisions | `src/lib/cfp/__tests__/decisions.test.ts` | Coupon generation, email data structure |
| Stripe Webhooks | `src/lib/stripe/__tests__/webhookHandlers.test.ts` | Lookup key parsing, ticket creation flow, vouchers |
| Social Handles | `src/lib/validations/__tests__/social-handles.test.ts` | GitHub/LinkedIn/X/Bluesky/Mastodon normalization |
| Pricing API | `src/pages/api/tickets/__tests__/pricing.test.ts` | Lookup keys, currency fallback, stock display |

## Untested High-Risk Areas

### 1. Role-Based Access Control — CRITICAL

**Files**: `src/lib/roles/guards.ts`, `src/lib/roles/constants.ts`

**Failure modes**:
- Non-admin gains admin permissions via broken role hierarchy check
- User manages another user's resources via `canManageUser()` bypass
- Ticket/workshop access control returns wrong result

**Recommended tests**:
- Unit test every guard function with each role
- Test role hierarchy transitions
- Test edge cases: self-management, null roles, unknown roles

### 2. Discount / UTM Lottery — HIGH

**Files**: `src/lib/discount/utm-lottery.ts`, `src/lib/discount/config.ts`, `src/lib/discount/cookies.ts`

**Failure modes**:
- UTM lottery generates discounts outside configured range
- Lottery criteria matching is too loose (accepts any UTM values)
- Cookie cooldown bypass allows repeated discount claims
- Config parsing returns NaN or undefined for percentages

**Recommended tests**:
- Unit test `evaluateUtmLottery()` with valid/invalid UTM params
- Test `matchesLotteryCriteria()` boundary conditions
- Test config parsing with missing/malformed env vars
- Test `randomIntBetween()` bounds

### 3. Rate Limiting — MEDIUM

**Files**: `src/lib/rate-limit/index.ts`

**Failure modes**:
- Rate limit window doesn't slide correctly (allows burst after window)
- Cleanup doesn't run, causing memory growth
- IP extraction fails on proxied requests (X-Forwarded-For)

**Recommended tests**:
- Test limit enforcement at boundary (N requests OK, N+1 blocked)
- Test window sliding behavior
- Test cleanup removes expired entries
- Test reset clears all state

### 4. Ticket Price Validation (Checkout) — HIGH

**Files**: `src/pages/api/create-checkout-session.ts`, `src/lib/tickets/`

**Failure modes**:
- Cart items with stale prices accepted at checkout
- Country code mapping fails for unlisted countries (defaults to CH silently)
- Customer creation fails but error swallowed

**Recommended tests**:
- Test `validateCheckoutPrices()` with price mismatches
- Test country code normalization edge cases
- Test cart validation (empty cart, missing fields)

### 5. Ticket Creation (Idempotency) — HIGH

**Files**: `src/lib/tickets/createTicket.ts`

**Failure modes**:
- Duplicate Stripe webhook fires, creates duplicate tickets
- QR code generation fails, ticket created without QR
- Guest ticket (null userId) handling errors

**Recommended tests**:
- Test idempotency check prevents duplicate creation
- Test all required fields are set in DB insert
- Test error handling for DB failures

### 6. Zod Validation Schemas — MEDIUM

**Files**: Various under `src/lib/validations/`

**Failure modes**:
- Schema too permissive, allows invalid data through
- Schema too strict, rejects valid input
- Missing validation on sensitive endpoints

**Recommended tests**:
- Test each schema with valid and invalid inputs
- Test boundary values (empty strings, max lengths, special chars)

### 7. Email Sending / Scheduling — LOW-MEDIUM

**Files**: `src/lib/email/`, `src/pages/api/admin/cfp/`

**Failure modes**:
- Email sent to wrong recipient
- Scheduled email fires multiple times
- Template rendering fails with missing data

**Recommended tests**:
- Test email data construction (recipient, subject, body)
- Test idempotency of scheduled sends

## Priority Matrix

| Area | Risk | Effort | Priority |
|------|------|--------|----------|
| Role guards | Critical | Low | **P0 — Do first** |
| UTM lottery | High | Low | **P0 — Do first** |
| Rate limiting | Medium | Low | **P1 — Do next** |
| Checkout validation | High | Medium | **P1 — Do next** |
| Ticket creation | High | Medium | **P1 — Do next** |
| Zod schemas | Medium | Low | **P2 — Batch** |
| Email scheduling | Low-Med | Medium | **P3 — Later** |

## First Batch (Implemented)

See `docs/audit/first-tests.md` for what was added and rationale.
