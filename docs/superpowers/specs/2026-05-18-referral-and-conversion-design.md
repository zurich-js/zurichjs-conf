# Referral Programme & Conversion Optimisation

## Context

ZurichJS Conference 2026 needs to increase ticket sales through word-of-mouth and improve checkout funnel conversion. Current state: no referral system exists, no exit-intent UI on the cart page, and no work-email team detection. The existing infrastructure (partnership coupons, cart abandonment tracking, PostHog analytics, Stripe integration) provides strong foundations to build on.

This spec covers three independent features:
1. **Two-sided referral programme** with tiered rewards and voucher accumulation
2. **Work email team detection** with checkout nudge and post-purchase outreach
3. **Exit-intent survey** on cart page with targeted retention CTAs

---

## 1. Referral Programme

### Overview

Every ticket buyer (existing and new) gets a unique referral code. When a friend uses the code and purchases a ticket, the friend gets a percentage discount and the referrer earns a fixed-amount voucher. Vouchers accumulate into a single active balance and are redeemable on VIP upgrades or workshops.

### Data Model

#### `referrers` table

One row per ticket holder who can refer friends.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `ticket_id` | UUID UNIQUE FK → tickets | The referrer's conference ticket |
| `email` | TEXT NOT NULL | |
| `first_name` | TEXT NOT NULL | |
| `last_name` | TEXT NOT NULL | |
| `referral_code` | TEXT UNIQUE NOT NULL | Format: `REF-XXXXXXXX` (8 random alphanumeric) |
| `total_referrals` | INTEGER DEFAULT 0 | Successful conversion count |
| `current_tier` | INTEGER DEFAULT 0 | 0 = no referrals, 1-3 based on config |
| `active_voucher_stripe_coupon_id` | TEXT | Current Stripe coupon ID |
| `active_voucher_stripe_promotion_code_id` | TEXT | Current Stripe promotion code ID |
| `active_voucher_code` | TEXT | Human-readable code for the voucher |
| `active_voucher_amount` | INTEGER DEFAULT 0 | Accumulated amount in cents |
| `active_voucher_currency` | voucher_currency | Matches referrer's ticket currency |
| `active_voucher_redeemed` | BOOLEAN DEFAULT FALSE | |
| `active_voucher_redeemed_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ DEFAULT NOW() | |

#### `referral_conversions` table

Audit trail of every successful referral.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `referrer_id` | UUID FK → referrers | |
| `referee_ticket_id` | UUID FK → tickets | |
| `referee_email` | TEXT NOT NULL | |
| `referee_stripe_session_id` | TEXT NOT NULL | |
| `reward_tier` | INTEGER NOT NULL | Tier at time of conversion |
| `reward_amount` | INTEGER NOT NULL | Cents earned for THIS referral |
| `reward_currency` | voucher_currency NOT NULL | |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | |

#### `referral_config` table (singleton)

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `is_active` | BOOLEAN DEFAULT TRUE | Kill switch |
| `referee_discount_percent` | INTEGER DEFAULT 10 | % off for the friend |
| `tiers` | JSONB | Array of tier objects (see below) |
| `reward_restricted_product_ids` | TEXT[] | Stripe product IDs for VIP upgrade + workshops |
| `expires_at` | TIMESTAMPTZ | Optional programme end date |
| `updated_at` | TIMESTAMPTZ DEFAULT NOW() | |
| `singleton` | BOOLEAN DEFAULT TRUE UNIQUE CHECK (TRUE) | Enforces single row |

**Tiers JSONB structure:**
```json
[
  { "min_referrals": 1, "max_referrals": 3, "reward_amount_chf": 1000, "reward_amount_eur": 900, "reward_amount_gbp": 800, "reward_amount_usd": 1100 },
  { "min_referrals": 4, "max_referrals": 8, "reward_amount_chf": 1500, "reward_amount_eur": 1350, "reward_amount_gbp": 1200, "reward_amount_usd": 1650 },
  { "min_referrals": 9, "max_referrals": null, "reward_amount_chf": 2500, "reward_amount_eur": 2250, "reward_amount_gbp": 2000, "reward_amount_usd": 2750 }
]
```

### RLS Policies

- **`referrers`**: Users can `SELECT` their own row (where `email = auth.jwt()->>'email'`). `INSERT`/`UPDATE` via service role only (webhook).
- **`referral_conversions`**: Users can `SELECT` rows where they are the referrer (join through `referrers`). `INSERT` via service role only.
- **`referral_config`**: `SELECT` for all authenticated users (config is public). `UPDATE` for admin role only.
- **`exit_intent_responses`**: No user access. `INSERT` via service role (API route uses service role client). `SELECT` for admin role only.

### Referral Code Generation

- Format: `REF-{8 random alphanumeric}` (using `crypto.randomBytes`, matching `vip-perks` pattern)
- Collision check: retry up to 3 times on unique constraint violation
- Referral link: `https://zurichjs-conf.vercel.app/tickets?ref=REF-XXXXXXXX`

### End-to-End Flow

#### Referrer onboarding

**Existing ticket holders (backfill):**
1. One-time seed script creates `referrers` rows for all `tickets` with `status = 'confirmed'`
2. Send `ReferralProgramLaunchEmail` to all existing holders with their personal code

**New purchases (going forward):**
1. Webhook `processTickets()` auto-creates the `referrers` row after ticket creation (after `autoGenerateVipPerks()`)
2. Referral code included in `TicketPurchaseEmail` confirmation and visible on success page

**Permanent access:**
- Referral code + stats visible on `/manage-order` page

#### Friend's purchase journey

1. Friend visits `zurichjs-conf.vercel.app/tickets?ref=REF-XXXXXXXX`
2. `useReferralCode` hook reads `ref` query param, stores in `localStorage` key `zurichjs_referral_code`
3. Friend adds tickets to cart, proceeds to checkout
4. At checkout session creation (`create-checkout-session.ts`):
   - Read referral code from request body (client sends it from localStorage)
   - Look up `referrers` row to validate code exists and programme is active
   - **Self-referral guard**: reject if `referrers.email` matches the checkout email (400 error)
   - Create a Stripe one-time percentage discount for the friend (using `referee_discount_percent` from config)
   - Apply discount to the session
   - Store `referralCode` in Stripe session metadata
5. Friend completes payment with discount applied

#### Referral conversion processing (webhook)

Triggered in `processTickets()` after ticket creation, when `session.metadata.referralCode` is present:

```
processReferralConversion(session, referralCode, ticketResults):
  1. Look up referrer by referral_code
  2. Load referral_config (singleton)
  3. Calculate reward:
     - new_total_referrals = referrer.total_referrals + 1
     - Determine tier from config.tiers based on new_total_referrals
     - Get reward_amount for referrer's currency from tier
  4. Voucher accumulation:
     IF referrer.active_voucher_redeemed = true OR referrer.active_voucher_amount = 0:
       → Create fresh Stripe coupon (amount_off, currency, duration=once, max_redemptions=1, applies_to=config.reward_restricted_product_ids)
       → Create Stripe promotion code linked to coupon
       → Update referrers row: set active_voucher_* fields, redeemed=false
     ELSE (unredeemed voucher exists):
       → new_amount = referrer.active_voucher_amount + reward_amount
       → Delete old Stripe coupon (stripe.coupons.del)
       → Create new Stripe coupon with new_amount
       → Create new Stripe promotion code
       → Update referrers row with new coupon IDs + new amount
  5. Insert referral_conversions row
  6. Update referrer: total_referrals++, current_tier, updated_at
  7. Send ReferralRewardEmail to referrer
  8. Track PostHog: referral_converted event
```

All steps wrapped in try/catch — referral processing failures must NOT fail the ticket purchase.

### Voucher Redemption

The referrer's voucher code is a standard Stripe promotion code with `applies_to` restrictions (VIP upgrade + workshop products). Redemption flows through the existing voucher input in the cart review step and the existing `validate-voucher.ts` → `useVoucherValidation()` path. No changes needed to the redemption flow.

When the voucher is redeemed, it must be detected in the webhook. The Stripe checkout session includes the promotion code ID in `session.total_details.breakdown.discounts`. In `processTickets()`, after processing the referral conversion, check if any applied discount's promotion code ID matches a `referrers.active_voucher_stripe_promotion_code_id`. If it does, update that referrer's `active_voucher_redeemed = true` and `active_voucher_redeemed_at`. This is a separate check from `extractPartnershipDiscountInfo()` — it queries the `referrers` table, not `partnership_vouchers`.

### Referral Analytics Events

| Event | When | Key properties |
|-------|------|---------------|
| `referral_code_generated` | Webhook creates referrer row | `referral_code`, `ticket_id` |
| `referral_link_clicked` | Friend lands with `?ref=` param | `referral_code`, `landing_page` |
| `referral_code_applied` | Friend's checkout session created with referral discount | `referral_code`, `referee_email`, `discount_percent` |
| `referral_converted` | Friend's purchase completes | `referral_code`, `referrer_email`, `referee_email`, `reward_amount`, `reward_tier`, `accumulated_total` |
| `referral_voucher_redeemed` | Referrer uses their voucher | `referral_code`, `voucher_amount`, `redeemed_on` (vip_upgrade or workshop) |

---

## 2. Work Email Team Detection

### Overview

When a buyer enters a work email at checkout, show a banner with colleague count. After purchase, include a "bring your team" section in the confirmation email with their referral link.

### Free Email Domain List

`src/data/free-email-domains.ts` — exported `FREE_EMAIL_DOMAINS: Set<string>` containing ~400 free providers (gmail.com, hotmail.com, yahoo.com, outlook.com, protonmail.com, etc.). Any domain NOT in this set is treated as a work email.

Source: well-maintained open-source lists. Curated to avoid false positives on small company domains.

### Checkout Banner (real-time)

**Hook**: `useWorkEmailDetection(email: string)`
- Debounced (500ms after email field blur)
- Extracts domain, checks against `FREE_EMAIL_DOMAINS`
- If work email → calls `GET /api/team/colleagues?domain=<domain>`
- Returns `{ isWorkEmail, colleagueCount, companyName, isLoading }`

**API route**: `GET /api/team/colleagues`
- Auth: session-based (user is in checkout)
- Zod validation: `{ domain: z.string().min(3) }`
- Service role query: count confirmed tickets using parameterized query with `email ILIKE $1` where `$1 = '%@' || domain` (never string-interpolate the domain into the query). Excludes the requester's email.
- Also queries most common `company` value for that domain via a separate parameterized query
- Domain validated: must match `/^[a-z0-9.-]+\.[a-z]{2,}$/` (no SQL wildcards or special chars)
- Returns `{ count: number, companyName: string | null }`
- Caches response for 5 minutes (in-memory or via response headers)

**Component**: `ColleagueBanner` in checkout step
- Renders when `colleagueCount > 0`: *"3 people from Acme Corp are already attending — bring your whole team!"*
- Links to team request form (already exists for 3+ seat orders)
- Hidden if count is 0 or email is a free provider

**Privacy**: Only returns aggregate count + company name. Never exposes individual emails or names.

### Post-Purchase Email Enhancement

In the webhook, after ticket creation:
1. Check if buyer's email domain is NOT in `FREE_EMAIL_DOMAINS`
2. If work email, query colleague count server-side
3. Add "Bring your team" section to `TicketPurchaseEmail`:
   - *"X of your colleagues at {company} are attending too"*
   - Personal referral link: *"Share this link with your team — they get {Y}% off and you earn rewards"*
   - CTA button linking to the referral URL

### Team Detection Analytics

| Event | When | Key properties |
|-------|------|---------------|
| `work_email_detected` | Checkout email identified as work email | `domain`, `colleague_count`, `company_name` |
| `colleague_banner_shown` | Banner rendered to user | `domain`, `colleague_count` |
| `colleague_banner_clicked` | User clicks team CTA | `domain`, `colleague_count` |

---

## 3. Exit-Intent Survey

### Overview

When a user tries to leave the cart page, show a quick survey modal to understand why, then show a targeted retention response. Fires once per session and never during active payment.

### Exit Detection

**Hook**: `useExitIntent(options)`

| Trigger | Platform | Condition |
|---------|----------|-----------|
| `mouseleave` on `document.documentElement` | Desktop | `event.clientY < 0` (cursor moving toward browser chrome) |
| `visibilitychange` → `hidden` | Mobile | Tab switch or app switch |

**Guards:**
- `sessionStorage.getItem('zurichjs_exit_survey_shown')` — only show once per session
- Does NOT fire on the payment step (check current cart step from context)
- Does NOT fire within the first 10 seconds of page load (avoid premature triggers)
- Does NOT fire if cart is empty

### Survey Modal

**Component**: `ExitIntentSurvey` (molecule — it's a composition of atoms)

**Reasons (radio buttons):**

| Value | Label | Targeted response |
|-------|-------|------------------|
| `too_expensive` | "It's too expensive right now" | *"Ask a friend who's attending for their referral link to get {Y}% off!"* |
| `not_ready` | "I'm not ready to buy yet" | *"No worries — your cart is saved. We'll send you a reminder."* |
| `comparing` | "I'm comparing with other events" | Social proof: *"{N} developers have already registered. Here's what's included: [key highlights]"* |
| `missing_info` | "I need more information" | Link to FAQ + support email |
| `other` | "Something else" | Optional text input + *"We'd love to understand — drop us a note at {support email}"* |

**UX flow:**
1. Modal appears with dim backdrop
2. User selects a reason → targeted response appears inline below
3. Close button always visible (never block exit)
4. On close or after 15 seconds: save response and dismiss

### Data Storage

**Table**: `exit_intent_responses`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `session_id` | TEXT NOT NULL | PostHog distinct_id or anonymous session |
| `email` | TEXT | If captured during checkout |
| `reason` | TEXT NOT NULL | One of the 5 values above |
| `reason_detail` | TEXT | Free text for "other" |
| `cart_total` | INTEGER | Cents |
| `cart_currency` | TEXT | |
| `cart_items_count` | INTEGER | |
| `checkout_step` | TEXT | Which step they were on |
| `response_shown` | TEXT | Which CTA we showed |
| `response_clicked` | BOOLEAN DEFAULT FALSE | Did they click the CTA |
| `posthog_distinct_id` | TEXT | For joining with PostHog data |
| `created_at` | TIMESTAMPTZ DEFAULT NOW() | |

**API route**: `POST /api/surveys/exit-intent`
- No auth required (user may not be logged in)
- Zod validation on request body
- Inserts row into `exit_intent_responses`
- Returns 200

**PostHog events:**

| Event | When | Key properties |
|-------|------|---------------|
| `exit_survey_shown` | Modal appears | `cart_total`, `cart_items_count`, `checkout_step` |
| `exit_survey_response` | User selects a reason | `reason`, `reason_detail`, `cart_total` |
| `exit_survey_cta_clicked` | User clicks the targeted CTA | `reason`, `response_shown` |
| `exit_survey_dismissed` | User closes without responding | `time_shown_seconds` |

---

## New Files

### Referral system
```
src/lib/referrals/
  index.ts                          — barrel exports
  config.ts                         — read referral_config singleton
  referrer.ts                       — createReferrer(), generateReferralCode()
  conversion.ts                     — processReferralConversion(), accumulateVoucher()
  types.ts                          — Referrer, ReferralConversion, ReferralConfig, ReferralTier types

src/hooks/useReferralCode.ts        — reads ?ref= param, persists to localStorage
src/pages/api/referrals/status.ts   — GET: referrer stats + active voucher for manage-order page

src/emails/templates/ReferralRewardEmail.tsx      — "Your friend bought a ticket! You earned X"
src/emails/templates/ReferralProgramLaunchEmail.tsx — announcement to existing holders

src/lib/analytics/events/referral-events.ts       — event type definitions
```

### Team detection
```
src/lib/team-detection/
  index.ts
  free-email-domains.ts             — FREE_EMAIL_DOMAINS Set
  detect.ts                         — isWorkEmail(), getColleagueCount()

src/hooks/useWorkEmailDetection.ts
src/components/cart/ColleagueBanner.tsx
src/pages/api/team/colleagues.ts
```

### Exit-intent survey
```
src/hooks/useExitIntent.ts
src/components/cart/ExitIntentSurvey.tsx
src/pages/api/surveys/exit-intent.ts
src/lib/analytics/events/survey-events.ts
```

### Migrations
```
supabase/migrations/YYYYMMDDHHMMSS_add_referral_system.sql       — referrers, referral_conversions, referral_config tables + RLS
supabase/migrations/YYYYMMDDHHMMSS_add_exit_intent_surveys.sql   — exit_intent_responses table + RLS
```

### Seed script
```
supabase/seeds/seed-referral-backfill.ts    — create referrer rows for existing confirmed tickets
```

## Modified Files

| File | Change |
|------|--------|
| `src/lib/stripe/checkout/tickets.ts` | Call `processReferralConversion()` after `autoGenerateVipPerks()` when `session.metadata.referralCode` is present |
| `src/pages/api/create-checkout-session.ts` | Accept `referralCode` in request body, validate it, apply friend's discount, store in session metadata |
| `src/pages/cart.tsx` | Mount `ExitIntentSurvey` component, pass `useReferralCode` value to checkout flow |
| `src/components/cart/ReviewStep.tsx` | No changes needed (voucher input already exists) |
| `src/components/cart/CheckoutStep.tsx` | Add `ColleagueBanner` below email field using `useWorkEmailDetection` |
| `src/pages/success.tsx` | Add "Share & Earn" section showing referral code + share buttons |
| `src/pages/manage-order.tsx` | Add referral code section with stats (total referrals, current tier, active voucher) |
| `src/emails/templates/TicketPurchaseEmail.tsx` | Add referral CTA section; conditionally add "bring your team" section for work emails |
| `src/lib/stripe/webhookHandlers.ts` | Thread referral code through to `processTickets()` |
| `src/contexts/CartContext.tsx` | Store and pass through `referralCode` from localStorage |

---

## Verification Plan

### Referral Core
1. Create a test referrer via seed script; verify `referrers` row and code format
2. Visit tickets page with `?ref=REF-XXXXXXXX`; verify code stored in localStorage
3. Complete a purchase with the referral code; verify:
   - Friend gets percentage discount in Stripe session
   - `referral_conversions` row created
   - Referrer's `active_voucher_amount` updated correctly
   - `ReferralRewardEmail` sent to referrer
   - PostHog `referral_converted` event fired
4. Make a second referral for the same referrer; verify accumulation:
   - Old Stripe coupon deleted
   - New coupon with accumulated amount created
   - `referrers.active_voucher_amount` = sum of both rewards
5. Redeem the voucher on a workshop; verify `active_voucher_redeemed = true`
6. Make a third referral; verify fresh voucher created (not accumulated on redeemed one)
7. Test tier boundaries: verify reward amount changes at tier thresholds

### Team Detection
1. Enter a work email (e.g. @google.com) in checkout; verify banner shows with colleague count
2. Enter a free email (gmail.com); verify no banner
3. Verify API returns 0 for a domain with no existing tickets
4. Verify post-purchase email includes "bring your team" section for work emails only

### Exit-Intent Survey
1. On cart page, move mouse above viewport; verify modal appears
2. Select "too expensive"; verify targeted response shown
3. Verify `exit_intent_responses` row created via API
4. Verify PostHog events fired
5. Refresh page; verify modal does NOT show again (sessionStorage gate)
6. Navigate to payment step; verify exit intent does NOT trigger
7. Test mobile: switch tabs; verify modal appears on return
