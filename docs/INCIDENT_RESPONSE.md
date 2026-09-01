# Incident Response Runbook

How to go from "something is wrong" to "fixed" in minutes. Written for
conference day; useful year-round.

## The 60-second triage, always in this order

1. **Is the site up?** `curl -s https://conf.zurichjs.com/api/health` →
   `status: ok`? A `503` body names exactly which dependency is failing.
2. **Sentry** ([zurichjs project](https://zurichjs.sentry.io)) → Issues,
   filter `environment:production`. Unhandled crashes and every handled
   `high`/`critical` error land here, grouped and titled.
3. **PostHog EU** → Error tracking. EVERY handled error lands here
   (including low/medium the client doesn't send to Sentry).
4. **Stripe Dashboard** → Developers → Webhooks → delivery attempts, if the
   symptom is payment/fulfillment shaped.
5. **Resend Dashboard** → Emails, if the symptom is "no email arrived".

## How errors flow (what lands where)

- `logger.error(...)` anywhere → **PostHog + Sentry**, same `code`, same
  severity, same fingerprint → the SAME grouped title in both tools.
- Unhandled server crash → `instrumentation.ts` → Sentry + PostHog.
- Unhandled client crash → PostHog `capture_exceptions` + Sentry client SDK;
  render crashes also hit the `ErrorBoundary` (fingerprint `render/page` or
  `render/root`).
- `logger.warn(...)` → console + a Sentry breadcrumb (context on the next
  error, not an event by itself).
- API 4xx/5xx responses → body `{ error, code, requestId }`.

## requestId: from user screenshot to root cause

Every API response carries `x-request-id` (header) and `requestId` (error
body). User-facing failure UI (checkout, error pages) shows it as
"reference …". Given a requestId:

- **Sentry**: search `request_id:<id>`.
- **PostHog**: filter events/exceptions where `requestId = <id>`.
- **Vercel logs**: search the id (it is on every log line of that request).

Given a `code` (e.g. from an error screenshot or a PostHog alert), search the
same way: Sentry `error_code:<CODE>`, PostHog property `code = <CODE>`. Codes
live in `src/lib/errors/codes.ts` — one registry, used everywhere.

## Incident playbooks

### 1. "Checkout is broken" / conversion suddenly at zero

- PostHog: `checkout_session_failed` events (fires when session creation
  fails — includes `error_code`, `request_id`, `http_status`).
  `payment_failed` covers the Stripe payment step itself.
- Sentry: `error_code:CHECKOUT_SESSION_FAILED`.
- Usual causes: Stripe key rotated/revoked (`/api/health?deep=1` as admin
  confirms Stripe API reachability), price-stage misconfig
  (`src/config/pricing-stages.ts`), Supabase down (health endpoint).
- The user sees the real message + requestId in the cart UI; ask for the
  reference if reported by a human.

### 2. Webhook failing / "paid but nothing happened"

- Stripe Dashboard → Webhooks → recent deliveries. A 500 means we threw —
  Stripe RETRIES automatically (this is by design; retries self-heal).
- Supabase `webhook_events` table: one row per event —
  `status = processed | failed | processing`, plus the error text.
  `failed` rows that never turn `processed` are the incident.
- Sentry/PostHog: `error_code:WEBHOOK_PROCESSING_FAILED`, or the specific
  codes below.
- **Do not panic on a single failure**: the pipeline is idempotent
  (event-id ledger + per-entity dedupe). A retry that succeeds is the system
  working.

### 3. "I paid but never got my ticket email"

- The webhook retry resends any ticket whose
  `tickets.confirmation_email_sent_at IS NULL` — most cases self-heal within
  Stripe's retry schedule (5 min → 30 min → 2 h …).
- Query: `select id, email, confirmation_email_sent_at from tickets where
  stripe_session_id = '<session>'` — a NULL means the email genuinely never
  went out.
- Force the heal: Stripe Dashboard → the `checkout.session.completed` event →
  "Resend". Only unsent emails are re-dispatched; nothing duplicates.
- Tracking: `error_code:TICKET_EMAIL_FAILED` (grouped under
  `ticket-confirmation-email-failed`). Check Resend dashboard for the
  provider-side reason.
- At the door with no email: the ticket row EXISTS (payment succeeded ⇒ row
  written) — look it up by email in the admin and check them in manually.

### 4. Refund went through on Stripe but the ticket still scans valid

- Alert: `error_code:REFUND_DB_UPDATE_FAILED` (critical). Context carries
  `ticketId` + `stripeRefundId`.
- Fix: **retry the refund from the admin UI.** The endpoint recognizes
  `charge_already_refunded` and completes only the DB half — it will not
  double-refund.
- Same pattern for `TICKET_CANCEL_DB_UPDATE_FAILED`.

### 5. Workshop seat paid but not registered

- `error_code:WORKSHOP_SEAT_FULFILLMENT_FAILED` → the webhook now 500s so
  Stripe retries; registration creation is idempotent by
  (session, workshop, seat_index). Usually self-heals.
- `error_code:WORKSHOP_OVERSOLD` (critical) does NOT retry by design —
  a retry can't create capacity. Manual resolution: add a seat or refund;
  the Slack notification carries buyer/attendee/amount.

### 6. Door check-in is down

- `/api/health` first (Supabase reachability is the usual culprit — the door
  system is Postgres RPCs).
- Sentry/PostHog: issues titled `DoorRpcError` (fingerprint `door-rpc:<fn>`
  names the failing Postgres function).
- Door staff see stable messages ("Could not check that attendee in") with a
  requestId; the trace behind it has the Postgres code/details/hint.
- Fallback: manual admit exists in the door UI; worst case, mark attendance
  on paper against the roster and reconcile later.

### 7. Site down / 500s everywhere

- `/api/health` 503 body names the failing dependency; also Vercel status +
  deploy history (instant rollback in Vercel UI if a deploy correlates).
- Sentry issues tagged `environment:production` sorted by "first seen" —
  a brand-new issue right after a deploy is that deploy.

## Alert configuration (SaaS side — click these in, once)

**Sentry** (Alerts → New alert, project `zurichjs`):
1. Any event where `severity:critical` AND `environment:production` → page
   immediately (email/Slack).
2. New issue where `error_type:payment` → notify.
3. Issue frequency spike (default "high volume" template) → notify.

**PostHog** (Error tracking + Insights → Alerts):
1. `$exception` count where `code` ∈ {TICKET_CREATION_FAILED,
   TICKET_EMAIL_FAILED, REFUND_DB_UPDATE_FAILED,
   WORKSHOP_SEAT_FULFILLMENT_FAILED, WEBHOOK_PROCESSING_FAILED} > 0 per
   10 min → alert.
2. `checkout_session_failed` count > 3 per 15 min → alert (funnel break).

**Uptime** (UptimeRobot / BetterStack / Vercel checks): GET
`https://conf.zurichjs.com/api/health` every minute, alert on non-200.
Do NOT point the pinger at `?deep=1`.

## Conference-day war room

Before doors open:
- [ ] `/api/health` returns `ok`; `/api/health?deep=1` (admin) returns `ok`.
- [ ] Sentry + PostHog error views open on a laptop that stays open.
- [ ] Stripe webhook deliveries: zero pending failures.
- [ ] `select count(*) from webhook_events where status = 'failed'` → 0
      (or every row explained).
- [ ] `select count(*) from tickets where confirmation_email_sent_at is null
      and status = 'confirmed'` → 0 (or handled).
- [ ] Door station signed in; test badge scan on a test ticket.
- [ ] Phone numbers: who can access Vercel, Stripe, Supabase, Resend.

During the day, one person owns "watch the boards": Sentry issues +
PostHog `Conference Day` dashboard + Stripe webhook page. Everything
critical is fingerprinted — a NEW grouped title appearing is the signal that
matters, not volume on known ones.

## PostHog "Conference Day" dashboard (build once)

1. `$exception` count by `code` (bar, last 24 h).
2. Checkout funnel: `checkout_started` → `payment_step_viewed` →
   `payment_submitted` → `checkout_completed`, with `checkout_session_failed`
   and `payment_failed` as overlay series.
3. `error_code:WEBHOOK_PROCESSING_FAILED` count over time.
4. Door: check-in events per 10 min + `DoorRpcError` exceptions.
5. `TICKET_EMAIL_FAILED` count (should be flat zero).

## Conventions when fixing forward

- Throw tagged errors (`AppError` subclasses from `@/lib/errors`), let the
  route wrapper respond; log each failure once where it's caught.
- Never return 200 from the webhook for a partially-handled event — throwing
  is what makes Stripe retry, and retries are safe (idempotent + email
  stamping).
- New error codes go in `src/lib/errors/codes.ts` AND get a row in the
  playbooks above if they're actionable.
