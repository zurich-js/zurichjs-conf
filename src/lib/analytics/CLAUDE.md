# Analytics — `src/lib/analytics/`

PostHog (EU region). Type-safe event tracking, server + client.

## Two clients

| Where | Import | Use for |
|---|---|---|
| Browser | `analytics` from `@/lib/analytics/client` | UI events, button clicks, form interactions |
| Server | `serverAnalytics` from `@/lib/analytics/server` | API route events, webhook fulfilment, server-rendered tracking |

Both share the same event registry (`events.ts`) so payloads are typed identically.

## Adding a new event

1. Add an entry to `events.ts` with a `snake_case` name and a TypeScript type for
   its properties.
2. Call `analytics.capture('event_name', { ... })` (client) or
   `serverAnalytics.capture('event_name', { ... }, { distinctId })` (server).
3. The properties param is type-checked against the registry entry.

Example:

```typescript
// events.ts
export type CheckoutEvents = {
  checkout_started: { cart_total: number; cart_currency: string; cart_item_count: number };
  checkout_completed: { order_id: string; cart_total: number };
};

// usage
analytics.capture('checkout_started', {
  cart_total: 100,
  cart_currency: 'CHF',
  cart_item_count: 2,
});
```

## Identification

When you capture an email (e.g. in checkout):

```typescript
analytics.identify(email, { /* user props */ });
```

This links prior anonymous events to the email — essential for cart-abandonment
recovery.

## Server-side events

`serverAnalytics.capture()` needs a `distinctId` (user id, email, or anonymous id
passed from the client via cookie). Don't fabricate ids.

For API routes that don't have a user identity, skip server analytics rather than
attribute to a fake id.

## Logger integration

`logger.error()` automatically forwards errors to PostHog via `serverAnalytics`.
You don't need to manually capture errors as events — use the logger.

## Conventions

- Event names: `snake_case`, prefixed by domain (`checkout_*`, `cfp_*`, `admin_*`).
- Property names: `snake_case`.
- Never include PII beyond email (no phone numbers, addresses, payment info).
- Numbers as numbers, not strings.
- Currencies as ISO codes (`CHF`, `EUR`, `USD`, `GBP`).

## PostHog rewrite

`next.config.ts` rewrites `/ingest/*` → PostHog to dodge ad-blockers. The client
init in `client.ts` is configured for that path. Don't change the rewrite without
also updating the client `host` option.

## Tech-stack detector

`techStackDetector/` is a sub-library that parses speaker bios/abstracts and
identifies which libraries/frameworks they cover. Used in CFP analytics.
Independently tested in `techStackDetector/__tests__/`.

## Reference

- `events.ts` — event registry (single source of truth for shapes)
- `helpers.ts` — pre-built event builders (e.g. cart event from cart state)
- `docs/ANALYTICS_AND_LOGGING.md` — full guide
