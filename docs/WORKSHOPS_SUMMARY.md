# Workshops — Feature Summary

End-to-end workshops: admin CRUD, public browse + purchase, Stripe checkout, confirmation emails.

## Public flow

- **`/workshops`** — Engineering Day schedule (CSR + single TanStack Query). Scheduled workshops only become full cards when a published, Stripe-price-resolved offering exists; otherwise the slot renders as TBA.
- **`/workshops/[slug]`** — detail page with currency-aware price panel (CHF / EUR / GBP) only for published, price-resolved workshop offerings.
- **Cart + checkout** — workshops use the existing cart UI with quantity selector (multi-seat). The cart’s attendee step collects one attendee per seat grouped by workshop. Team upsell triggers on ≥3 total seats (tickets + workshop seats).

## Admin

Workshop operations live in **`/admin/speakers` → Workshops**:

- Existing CFP edit action can still update the base submission fields.
- The `CircleDollarSign` action opens the workshop admin modal for CFP content and commerce:
  - CFP: title, abstract, level, primary/additional speakers, duration, max participants.
  - Placement: read-only date, time, duration, room, and visibility from the Schedule tab.
  - Pricing: Stripe product id + CHF base lookup key, "Validate Stripe" (checks CHF/EUR/GBP).
  - Capacity & status with allowed-transition guard.
  - Inline Registrants + Revenue panels.
  - Archive action and public-page link when published.
- **Hard publish gate**: Publish button disabled until the 8-item readiness checklist is fully green, including Stripe validation.

Workshop financial reporting lives in **`/admin` → Financials**:

- Workshop seats sold are tracked from confirmed `workshop_registrations`.
- Workshop gross revenue, discounts, and Stripe fees are grouped by currency.
- Workshops appear as a distinct sales category and are included in combined gross/net revenue totals without mixing them into ticket counts.

## Data + Stripe integration

- Repurposed `workshops` table as a commerce overlay on CFP submissions (`cfp_submission_id` FK). CFP submissions and program schedule rows remain the admin source of truth; saving commerce syncs the overlay from the current schedule row and stores the derived workshop end time plus commerce state.
- Multi-seat registrations: `workshop_registrations.seat_index` with `UNIQUE (session_id, workshop_id, seat_index)`.
- Atomic seat insert via `insert_workshop_registration_atomic` Postgres function (`SELECT … FOR UPDATE`) — concurrent purchases can't oversell.
- Stripe refunds automatically issued for any seat that loses the capacity race.
- Server-side validation at checkout: every workshop cart item is re-checked against DB + Stripe (published, priceId belongs to the workshop, seats available).
- `checkout_cart_snapshots` table stores workshop attendees per session — avoids the Stripe metadata 500-char limit.
- Webhook creates one registration row per seat, sends a per-seat confirmation email (title, date, time, room, instructor).

## Admin security & observability

- Zod validation on every admin route.
- Status transitions gated (`draft` → `published` etc.).
- Audit logging on every mutation (actor + before/after snapshot).
- Structured `logger.scope()` everywhere in the workshops data layer.

## Testing

393 tests passing (14 new). Readiness logic, schedule helpers, and existing webhook paths all covered.

## Key files

- Migrations: `20260420000001_workshops_offering_overlay.sql`, `20260421000000_workshop_registrations_multi_seat.sql`, `20260421000001_checkout_cart_snapshots.sql`
- Admin: `src/pages/admin/speakers.tsx` + `src/components/admin/workshops/**`
- Public: `src/pages/workshops.tsx`, `src/pages/workshops/[slug].tsx`, `src/components/workshops/**`
- APIs: `src/pages/api/workshops/{pricing,schedule}.ts`, `src/pages/api/admin/workshops/**`, `src/pages/api/create-checkout-session.ts`
- Stripe: `src/lib/stripe/checkout/workshops.ts`, `src/lib/workshops/{createRegistration,validateCartItems,stripePriceLookup}.ts`
- Email: `src/lib/email/workshop-emails.ts`, `src/emails/templates/WorkshopPurchaseEmail.tsx`
