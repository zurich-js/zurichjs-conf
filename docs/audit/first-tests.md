# First Batch of Tests

## Summary

Added **75 new tests** across **5 new test files**, bringing the total from 247 to 322 tests. All pass in ~1.8s.

## What Was Added

### 1. Role Constants (`src/lib/roles/__tests__/constants.test.ts`) — 9 tests

Tests for the role hierarchy, permission checking, and role utility functions.

**Why**: The role system is the foundation of access control. A bug in `hasRolePermission()` or `isAdmin()` could grant unauthorized access to admin-only operations (ticket management, user management, CFP admin).

**Covers**:
- Role hierarchy ordering (attendee < speaker < admin)
- `hasRolePermission()` — same-level, higher, and lower role checks
- `isAdmin()`, `isSpeaker()`, `isAttendee()` — boundary conditions

### 2. Role Guards (`src/lib/roles/__tests__/guards.test.ts`) — 24 tests

Tests for every guard function used in API routes and UI to enforce access control.

**Why**: These guards protect admin endpoints, ticket management, workshop management, and user data. Zero prior test coverage on the most security-critical code.

**Covers**:
- `canAccessRole()` — null profile, admin access, attendee denied
- `canManageUser()` — self-management, admin managing others, non-admin denied
- `canManageTickets()` — admin-only enforcement
- `canManageWorkshops()` — admin override, speaker owns workshop, attendee denied
- `canViewWorkshopRegistrations()` — instructor access, admin override

### 3. UTM Lottery (`src/lib/discount/__tests__/utm-lottery.test.ts`) — 19 tests

Tests for the UTM-based discount lottery that generates 5-15% discounts from offline marketing campaigns.

**Why**: This generates real Stripe discounts. A bug in criteria matching could either (a) issue discounts to non-qualifying visitors or (b) fail to grant deserved discounts. The randomness is mocked for deterministic testing.

**Covers**:
- `evaluateUtmLottery()` — valid combinations, case insensitivity, all medium types
- Ineligible combinations — missing params, invalid source/medium/campaign
- Discount range bounds (5% min, 15% max)
- `parseUtmParams()` — URLSearchParams, string, missing params, empty string

### 4. Discount Config (`src/lib/discount/__tests__/config.test.ts`) — 7 tests

Tests for discount system configuration parsing from environment variables.

**Why**: Misconfigured defaults (NaN percentages, wrong cooldown) could silently break the discount system or issue incorrect discounts. Documents that non-numeric env vars produce NaN rather than failing.

**Covers**:
- `COOKIE_NAMES` constants
- `getClientConfig()` — defaults, forceShow, showProbability parsing, NaN edge case
- `getServerConfig()` — all 5 config values with defaults and custom env vars

### 5. Rate Limiter (`src/lib/rate-limit/__tests__/rate-limit.test.ts`) — 16 tests

Tests for the in-memory sliding window rate limiter used on API routes.

**Why**: Rate limiting protects against abuse of payment endpoints, auth endpoints, and ticket operations. The sliding window algorithm is non-trivial and previously untested.

**Covers**:
- `createRateLimiter()` — allows within limit, blocks over limit, independent tracking
- Window expiry — requests allowed again after window passes
- `resetAt` timestamp accuracy
- `reset()` — clears limit for specific identifier
- `peek()` — non-incrementing inspection, null for unknown/expired entries
- `destroy()` — cleanup
- `getClientIp()` — x-forwarded-for (string/array), x-real-ip, socket fallback, "unknown" fallback, whitespace trimming

## Test Quality Notes

- All tests use `vi.useFakeTimers()` where time-dependent behavior is tested
- `Math.random` is mocked for deterministic discount range testing
- Environment variables are stubbed and restored between tests
- Profile factory function (`makeProfile()`) reduces boilerplate in guard tests
