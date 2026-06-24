# Emails — `src/emails/`

Transactional emails. React Email components rendered to HTML, sent via Resend.

## Preview locally

```bash
pnpm email:dev
```

Serves a preview at `http://localhost:3001` with hot reload. Every `.tsx` in this
directory becomes a preview page.

## Sending

Sending is orchestrated from `src/lib/email/`:

| Module | Sends |
|---|---|
| `lib/email/cfp-emails.ts` | Generic CFP notifications |
| `lib/email/cfp-decision-emails.ts` | Accept / reject / waitlist decisions |
| `lib/email/ticket-emails.ts` | Confirmation, upgrade, refund |
| `lib/email/workshop-emails.ts` | Workshop registration, cancellation |
| `lib/email/verification-emails.ts` | Student / unemployed verification |
| `lib/email/sponsorship-emails.ts` | Sponsor notifications |
| `lib/email/vip-emails.ts` | VIP perk notifications |
| `lib/email/newsletter.ts` | Resend newsletter list management |
| `lib/email/ticket-waitlist.ts` | Sold-out ticket waitlist (student/VIP) Resend audiences |
| `lib/email/issue-report-emails.ts` | Bug reports |

Each module:
1. Renders the React Email template via `@react-email/render`.
2. Calls Resend with `from = EMAIL_FROM`, `replyTo = EMAIL_REPLY_TO` (from `lib/email/config.ts`).
3. Logs via `logger.scope('Email <Type>')` on success / failure.

## Template conventions

- Templates are React components returning React Email primitives
  (`<Html>`, `<Head>`, `<Body>`, `<Container>`, etc.).
- Props are explicit and typed — no `any`, no implicit context.
- Use inline styles (React Email's `style={}`) — most clients don't support CSS in `<head>`.
- Always include a **plain-text fallback** version where possible.
- Test in Gmail, Outlook, Apple Mail before changing anything load-bearing.

## Sending pattern

```typescript
import { render } from '@react-email/render';
import { resend } from '@/lib/email/config';
import { logger } from '@/lib/logger';
import { MyEmailTemplate } from '@/emails/MyEmailTemplate';

const log = logger.scope('Email Decision');

export async function sendDecisionEmail(speaker: Speaker, decision: Decision) {
  const html = await render(MyEmailTemplate({ speaker, decision }));
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: speaker.email,
    replyTo: EMAIL_REPLY_TO,
    subject: `Your ZurichJS submission: ${decision.status}`,
    html,
  });
  if (error) {
    log.error('Failed to send decision email', error, { speakerId: speaker.id });
    throw error;
  }
}
```

## Webhook dispatch

Emails sent from Stripe webhook fulfillment (`lib/stripe/checkout/ticket-emails.ts`)
must be idempotent — if the webhook fires twice, the user must not get two
emails. Check for existing email-sent flags before sending.

## Don'ts

- Don't include personal access tokens, payment details, or QR codes that bypass auth.
- Don't use `<img src="https://...">` for critical content — fall back gracefully.
- Don't inline content from `src/data/` if it could be region-specific; pass it as a prop.
