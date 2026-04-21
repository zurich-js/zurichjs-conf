# Workshops — Feature Summary

End-to-end workshops: admin CRUD, public browse + purchase, Stripe checkout, confirmation emails.

## Public flow

- **`/workshops`** — Engineering Day schedule (CSR + single TanStack Query). Draft/unpublished workshops don't appear. Each workshop card shows price + Add-to-cart.
- **`/workshops/[slug]`** — detail page with currency-aware price panel (CHF / EUR / GBP).
- **Cart + checkout** — workshops use the existing cart UI with quantity selector (multi-seat). The cart’s attendee step collects one attendee per seat grouped by workshop. Team upsell triggers on ≥3 total seats (tickets + workshop seats).

## Admin (`/admin/workshops`)

- Summary strip (offerings, published, seats sold, gross revenue by currency).
- Filter chips (All / Not configured / Draft / Published / Archived) + search.
- Workshop cards with status chip, readiness badge (`X to fix` / `Ready`), enrollment bar, revenue row, "View public page" link.
- Slide-in edit drawer (Headless UI `Dialog` → focus trap, Escape, scroll lock):
  - Schedule: date, start/end time (duration auto-computed), room.
  - Pricing: Stripe product id + CHF base lookup key, "Validate Stripe" (checks CHF/EUR/GBP).
  - Capacity & status with allowed-transition guard.
  - Inline Registrants + Revenue panels.
- **Hard publish gate**: Publish button disabled until the 8-item readiness checklist is fully green, including Stripe validation.

## Data + Stripe integration

- Repurposed `workshops` table as a commerce overlay on CFP submissions (`cfp_submission_id` FK). Admin sets date/start/end in this table; webhook-synth schedule items power `/workshops`.
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
- Admin: `src/pages/admin/workshops.tsx` + `src/components/admin/workshops/**`
- Public: `src/pages/workshops.tsx`, `src/pages/workshops/[slug].tsx`, `src/components/workshops/**`
- APIs: `src/pages/api/workshops/{pricing,schedule}.ts`, `src/pages/api/admin/workshops/**`, `src/pages/api/create-checkout-session.ts`
- Stripe: `src/lib/stripe/checkout/workshops.ts`, `src/lib/workshops/{createRegistration,validateCartItems,stripePriceLookup}.ts`
- Email: `src/lib/email/workshop-emails.ts`, `src/emails/templates/WorkshopPurchaseEmail.tsx`
