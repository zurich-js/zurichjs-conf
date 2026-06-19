# Stripe — `src/lib/stripe/`

Payments. Touches checkout (server), payment element (client), and webhook
fulfillment.

## Layout

| File | Purpose |
|---|---|
| `client.ts` | Server-side Stripe SDK init (uses `STRIPE_SECRET_KEY`) |
| `client-browser.ts` | Browser SDK init (`@stripe/stripe-js`) |
| `webhookHandlers.ts` | Idempotent handlers for Stripe events (orchestrator) |
| `validate-checkout.ts` | Server-side validation of cart items, prices, quantities |
| `ticket-utils.ts` | Stripe product/price naming + metadata conventions |
| `checkout/tickets.ts` | Ticket purchase fulfillment (post-payment) |
| `checkout/workshops.ts` | Workshop registration fulfillment, multi-seat logic |
| `checkout/vip-upgrade.ts` | VIP tier upgrade handling |
| `checkout/ticket-emails.ts` | Email dispatch for ticket/workshop confirmations |
| `checkout/helpers.ts` | Shared post-checkout utilities |
| `index.ts` | Barrel exports |

## Webhook handler — `/api/webhooks/stripe.ts`

The single Stripe webhook entry point. Critical rules:

1. **Disable Next body parser** at file top:
   ```typescript
   export const config = { api: { bodyParser: false } };
   ```
2. **Verify signature** with `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`.
   Reject with 400 on signature failure — Stripe will retry.
3. **Idempotency** — every handler in `webhookHandlers.ts` checks for an existing
   record (by Stripe event id, payment intent id, or session id) before writing.
   Stripe retries; double-fulfilment is a real risk.
4. **Service role client** — webhooks are not user-authenticated, so they use
   `createServiceRoleClient()` (RLS bypassed). This is one of the few valid uses.

Events handled today: `checkout.session.completed`, `invoice.payment_succeeded`,
`charge.refunded`. Add new handlers to `webhookHandlers.ts`, not to the route file.

## Checkout (`/api/checkout/create-session.ts`)

- Re-derives prices from `src/config/pricing-stages.ts` + Supabase. Never trusts the
  client.
- Encodes cart metadata in `checkout_cart_snapshots` (a Supabase table) keyed by
  session id, because Stripe metadata is capped at 500 chars.
- Validates inventory (ticket caps, workshop seats) before creating the session.

## Money rules

- **Never trust client-supplied amounts.** Validate every line item against
  `pricing-stages.ts` or the Supabase row.
- **Currency is multi-currency.** Voucher conversions handle CHF/EUR/USD/GBP — see
  migrations `20260114000000_add_gbp_to_voucher_currency.sql` and
  `20260503000000_add_usd_to_voucher_currency.sql`.
- **Decimal arithmetic** — Stripe amounts are integer minor units (cents/centimes).
  Don't introduce float math.

## Tests

`__tests__/webhookHandlers.test.ts` is 1000+ lines of fixture-driven event tests.
Always add a test when adding a webhook handler — fulfilment bugs are silent in
production.

Price/inventory validation should also be covered by tests whenever checkout
validation logic changes.

## Local dev

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Test webhooks with:

```bash
stripe trigger checkout.session.completed
```
