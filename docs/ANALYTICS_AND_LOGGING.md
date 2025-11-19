# Analytics & Logging System Documentation

## Overview

This document explains the comprehensive analytics and logging system implemented for the ZurichJS Conference platform. The system provides:

- **Type-safe analytics tracking** using PostHog
- **Centralized, structured logging** that replaces console.log
- **Revenue analytics** for conversion and sales tracking
- **Error monitoring** with contextual metadata
- **Extensible event system** that's easy to evolve

## Table of Contents

1. [Analytics System](#analytics-system)
2. [Logging System](#logging-system)
3. [PostHog Insights](#posthog-insights)
4. [Common Use Cases](#common-use-cases)
5. [Best Practices](#best-practices)

---

## Analytics System

### Architecture

The analytics system is built around three core modules:

1. **`src/lib/analytics/events.ts`** - Type definitions for all analytics events
2. **`src/lib/analytics/client.ts`** - Browser-side analytics client
3. **`src/lib/analytics/server.ts`** - Server-side analytics client
4. **`src/lib/analytics/helpers.ts`** - Convenience functions for common tracking scenarios

### Key Features

- **Full Type Safety**: All events and properties are strictly typed
- **Discriminated Unions**: Ensures correct properties for each event type
- **Client & Server Support**: Works in both browser and Node.js environments
- **Automatic Enrichment**: Common properties (timestamp, URL, user agent) added automatically
- **Revenue Tracking**: Proper formatting for PostHog revenue analytics

### Event Types

All events are defined as a discriminated union in `events.ts`. This provides:

- Autocomplete in your IDE
- Type checking at compile time
- Centralized event documentation
- Easy refactoring and evolution

**Event Categories:**

- **Page Events**: `page_viewed`, `user_identified`
- **Ticket Events**: `ticket_viewed`, `ticket_added_to_cart`, `ticket_purchased`, `ticket_transferred`, `ticket_validated`, `ticket_checked_in`
- **Workshop Events**: `workshop_viewed`, `workshop_voucher_purchased`, `workshop_registered`, `workshop_cancelled`
- **Checkout Events**: `checkout_started`, `checkout_completed`, `checkout_abandoned`
- **Payment Events**: `payment_succeeded`, `payment_failed`
- **Engagement Events**: `button_clicked`, `form_submitted`, `form_error`, `link_clicked`
- **Feature Events**: `search_performed`, `filter_applied`, `share_clicked`
- **Error Events**: `error_occurred`, `api_error`, `webhook_received`

### Client-Side Usage

```typescript
import { analytics } from '@/lib/analytics/client'

// Track a simple event
analytics.pageView('/tickets', 'Tickets Page', 'tickets')

// Track a custom event with full type safety
analytics.track('ticket_added_to_cart', {
  ticket_category: 'standard',
  ticket_stage: 'early_bird',
  ticket_price: 4900,
  currency: 'CHF',
  ticket_count: 2,
  quantity: 2,
})

// Identify a user
analytics.identify('user_123', {
  email: 'user@example.com',
  name: 'John Doe',
  company: 'Acme Inc',
})

// Track revenue
analytics.revenue({
  amount: 9800,
  currency: 'CHF',
  type: 'ticket',
  transactionId: 'cs_123',
  productName: 'Early Bird Standard Ticket',
  productCategory: 'standard',
})

// Track an error
analytics.error('Payment failed', error, {
  type: 'payment',
  severity: 'critical',
  code: 'card_declined',
})
```

### Server-Side Usage

```typescript
import { serverAnalytics } from '@/lib/analytics/server'

// Track an event
await serverAnalytics.track('ticket_purchased', userId, {
  ticket_id: 'ticket_123',
  ticket_category: 'standard',
  ticket_stage: 'early_bird',
  ticket_price: 4900,
  currency: 'CHF',
  ticket_count: 1,
  // ... other properties
})

// Identify a user
await serverAnalytics.identify(userId, {
  email: 'user@example.com',
  name: 'John Doe',
})

// Track revenue
await serverAnalytics.revenue(userId, {
  amount: 4900,
  currency: 'CHF',
  type: 'ticket',
  transactionId: 'cs_123',
  productName: 'Early Bird Ticket',
})

// Don't forget to flush before serverless function terminates
await serverAnalytics.flush()
```

### Helper Functions

For common scenarios, use the helper functions in `helpers.ts`:

```typescript
import {
  trackTicketAddedToCart,
  trackCheckoutStarted,
  trackFormError,
  trackButtonClick,
} from '@/lib/analytics/helpers'

// Track ticket added to cart
trackTicketAddedToCart({
  category: 'standard',
  stage: 'early_bird',
  price: 4900,
  quantity: 2,
})

// Track checkout started
trackCheckoutStarted({
  cartItemCount: 2,
  cartTotalAmount: 9800,
  cartCurrency: 'CHF',
  cartItems: [
    {
      type: 'ticket',
      category: 'standard',
      stage: 'early_bird',
      quantity: 2,
      price: 4900,
    },
  ],
  email: 'user@example.com',
})

// Track form error
trackFormError({
  formName: 'checkout_form',
  formField: 'email',
  errorMessage: 'Invalid email address',
  errorType: 'validation',
})
```

---

## Logging System

### Overview

The logging system in `src/lib/logger/index.ts` provides structured, contextual logging that replaces all `console.log` statements.

### Features

- **Structured logging** with metadata
- **Multiple log levels** (debug, info, warn, error)
- **Context-aware** logging with scoped loggers
- **PostHog integration** for error tracking
- **Development vs Production** behavior
- **Automatic error type inference**

### Log Levels

- **`debug`**: Development-only verbose logging
- **`info`**: General informational messages
- **`warn`**: Warning messages that don't break functionality
- **`error`**: Error conditions that should be monitored

### Basic Usage

```typescript
import { logger } from '@/lib/logger'

// Info logging
logger.info('User logged in', { userId: '123' })

// Warning
logger.warn('Rate limit approaching', {
  userId: '123',
  requestCount: 95,
  limit: 100,
})

// Error logging
logger.error('Payment processing failed', error, {
  type: 'payment',
  severity: 'critical',
  code: 'card_declined',
  orderId: 'order_123',
})

// Debug (only in development)
logger.debug('Processing webhook', {
  eventType: 'checkout.session.completed',
  sessionId: 'cs_123',
})
```

### Scoped Logging

Create scoped loggers for modules with default context:

```typescript
import { logger } from '@/lib/logger'

// Create a scoped logger
const log = logger.scope('WebhookHandler', {
  requestId: req.headers['x-request-id'],
})

// All logs from this logger include module and requestId
log.info('Processing webhook', { eventType: 'checkout.completed' })
log.error('Failed to create ticket', error, {
  sessionId: 'cs_123',
})
```

### Log Output

**Development Mode:**
```
🔍 [WebhookHandler] Processing webhook
  Context: eventType="checkout.completed", requestId="req_123"
```

**Production Mode (JSON):**
```json
{
  "level": "info",
  "message": "Processing webhook",
  "timestamp": "2025-11-19T10:30:00.000Z",
  "module": "WebhookHandler",
  "context": {
    "eventType": "checkout.completed",
    "requestId": "req_123"
  }
}
```

### Error Tracking

Errors logged with `logger.error()` are automatically tracked in PostHog with:

- Error type inference (payment, auth, network, validation, system)
- Severity inference based on error type
- Stack traces
- Contextual metadata

```typescript
logger.error('Failed to process payment', error, {
  type: 'payment',        // Optional: inferred if not provided
  severity: 'critical',   // Optional: inferred from type
  code: 'card_declined',
  userId: '123',
  orderId: 'order_abc',
})
```

---

## PostHog Insights

### Setting Up Insights

PostHog Insights allow you to visualize and analyze your event data. Here's how to create common insights:

### 1. Revenue Analytics

**Total Revenue Over Time:**

1. Go to **Insights** → **New Insight**
2. Select **Trends**
3. Event: `purchase`
4. Aggregation: **Sum** → **Property value** → `revenue_amount`
5. Formula: Divide by 100 (to convert cents to dollars/CHF)
6. Group by: Day/Week/Month
7. Save as "Total Revenue"

**Revenue by Ticket Type:**

1. Create a Trends insight
2. Event: `purchase`
3. Aggregation: **Sum** → **Property value** → `revenue_amount`
4. Breakdown: `product_category`
5. Save as "Revenue by Ticket Type"

**Average Order Value:**

1. Create a Trends insight
2. Event: `purchase`
3. Add two series:
   - Series A: Sum of `revenue_amount`
   - Series B: Count of events
4. Formula: `A / B / 100` (divide by 100 for currency conversion)
5. Save as "Average Order Value"

### 2. Conversion Funnels

**Ticket Purchase Funnel:**

1. Go to **Insights** → **New Insight**
2. Select **Funnel**
3. Add steps:
   - Step 1: `page_viewed` where `page_category` = `tickets`
   - Step 2: `ticket_added_to_cart`
   - Step 3: `checkout_started`
   - Step 4: `payment_succeeded`
4. Time window: 30 minutes (adjust as needed)
5. Save as "Ticket Purchase Funnel"

**Workshop Registration Funnel:**

1. Create a Funnel insight
2. Steps:
   - Step 1: `workshop_viewed`
   - Step 2: `workshop_voucher_purchased`
   - Step 3: `workshop_registered`
3. Save as "Workshop Registration Funnel"

### 3. User Engagement

**Most Clicked Buttons:**

1. Create a Trends insight
2. Event: `button_clicked`
3. Breakdown: `button_text`
4. Sort by: Total count
5. Save as "Top Buttons"

**Form Errors:**

1. Create a Trends insight
2. Event: `form_error`
3. Breakdown: `form_name` or `form_field`
4. Save as "Form Errors"

### 4. Error Monitoring

**Errors by Type:**

1. Create a Trends insight
2. Event: `error_occurred`
3. Breakdown: `error_type`
4. Save as "Errors by Type"

**Critical Errors:**

1. Create a Trends insight
2. Event: `error_occurred`
3. Filter: `error_severity` = `critical`
4. Save as "Critical Errors"

### 5. Custom Dashboards

**Revenue Dashboard:**

Create a dashboard combining:
- Total Revenue (trend)
- Revenue by Ticket Type (breakdown)
- Average Order Value (formula)
- Ticket Purchase Funnel
- Top selling tickets (table)

**Operations Dashboard:**

Combine:
- Tickets Sold (count)
- Tickets Validated (count)
- Tickets Checked In (count)
- Workshop Registrations (count)
- Errors by Type
- Critical Errors Alert

### Creating Alerts

1. In any insight, click **Save** → **Create Alert**
2. Set threshold (e.g., "More than 10 errors in 1 hour")
3. Choose notification method (email, Slack)
4. Save alert

---

## Common Use Cases

### 1. Tracking Page Views

```typescript
// In _app.tsx or layout
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { analytics } from '@/lib/analytics/client'

export default function App({ Component, pageProps }) {
  const router = useRouter()

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      analytics.pageView(url)
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    return () => router.events.off('routeChangeComplete', handleRouteChange)
  }, [router.events])

  return <Component {...pageProps} />
}
```

### 2. Tracking Button Clicks

```typescript
import { trackButtonClick } from '@/lib/analytics'

<button
  onClick={() => {
    trackButtonClick({
      buttonText: 'Buy Tickets',
      buttonLocation: 'hero_section',
      buttonAction: 'navigate_to_tickets',
    })
    router.push('/tickets')
  }}
>
  Buy Tickets
</button>
```

### 3. Tracking Form Submissions

```typescript
import { analytics } from '@/lib/analytics'

const handleSubmit = async (data) => {
  try {
    await submitForm(data)

    analytics.track('form_submitted', {
      form_name: 'checkout_form',
      form_type: 'checkout',
      form_success: true,
    })
  } catch (error) {
    analytics.track('form_error', {
      form_name: 'checkout_form',
      error_message: error.message,
      error_type: 'validation',
      error_severity: 'low',
    })
  }
}
```

### 4. Tracking Revenue in Webhooks

```typescript
import { logger } from '@/lib/logger'
import {
  trackTicketPurchaseServer,
  trackWebhookReceivedServer,
} from '@/lib/analytics'

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const log = logger.scope('WebhookHandler', {
    sessionId: session.id,
  })

  const startTime = Date.now()

  try {
    log.info('Processing checkout session completed', {
      paymentStatus: session.payment_status,
    })

    // ... process tickets ...

    // Track ticket purchase
    await trackTicketPurchaseServer({
      distinctId: customerEmail,
      ticketId: ticket.id,
      category: ticketCategory,
      stage: ticketStage,
      price: amountPaid,
      currency: 'CHF',
      attendeeCount: 1,
      stripeSessionId: session.id,
      stripeCustomerId: stripeCustomerId,
      email: customerEmail,
      firstName,
      lastName,
    })

    const processingTime = Date.now() - startTime

    // Track successful webhook processing
    await trackWebhookReceivedServer({
      distinctId: 'system',
      webhookSource: 'stripe',
      webhookEventType: 'checkout.session.completed',
      webhookId: session.id,
      processingTimeMs: processingTime,
      success: true,
    })

    log.info('Successfully processed checkout', {
      ticketId: ticket.id,
      processingTimeMs: processingTime,
    })
  } catch (error) {
    log.error('Failed to process checkout', error, {
      type: 'payment',
      severity: 'critical',
    })

    await trackWebhookReceivedServer({
      distinctId: 'system',
      webhookSource: 'stripe',
      webhookEventType: 'checkout.session.completed',
      success: false,
    })

    throw error
  }
}
```

---

## Best Practices

### Event Tracking

1. **Be Specific**: Use descriptive event names (`ticket_purchased` not `purchase`)
2. **Consistent Naming**: Follow snake_case convention for all events and properties
3. **Include Context**: Always include relevant IDs, categories, and metadata
4. **Track User Actions**: Track what users do, not what the system does
5. **Revenue Format**: Always use smallest currency unit (cents) for revenue amounts

### Logging

1. **Use Appropriate Levels**:
   - `debug`: Detailed flow information for development
   - `info`: Important state changes and business events
   - `warn`: Recoverable issues or important notices
   - `error`: Failures that need attention

2. **Include Context**: Always provide relevant metadata
   ```typescript
   // Bad
   logger.info('User updated')

   // Good
   logger.info('User profile updated', {
     userId: '123',
     fieldsUpdated: ['email', 'name'],
   })
   ```

3. **Use Scoped Loggers**: Create module-specific loggers
   ```typescript
   const log = logger.scope('EmailService')
   log.info('Sending confirmation email', { ticketId: '123' })
   ```

4. **Error Handling**: Always log errors with full context
   ```typescript
   try {
     await processPayment()
   } catch (error) {
     log.error('Payment processing failed', error, {
       type: 'payment',
       severity: 'critical',
       orderId: 'order_123',
       amount: 4900,
     })
     throw error
   }
   ```

### Performance

1. **Batch Events**: PostHog automatically batches events, but avoid excessive tracking
2. **Flush on Serverless**: Always call `await serverAnalytics.flush()` before function terminates
3. **Async Tracking**: Server-side tracking is async - await it in critical paths
4. **Sampling**: For high-volume events, consider sampling in production

### Privacy & Security

1. **Sanitize Data**: Never track passwords, credit cards, or sensitive PII
2. **User Consent**: Respect user privacy preferences
3. **GDPR Compliance**: Use PostHog's data deletion features
4. **Mask Sensitive Fields**: Use PostHog's masking features for forms

### Type Safety

1. **Use Type Exports**: Import types from analytics module
   ```typescript
   import type { EventProperties } from '@/lib/analytics'
   ```

2. **Extend Carefully**: When adding new events, follow the discriminated union pattern
   ```typescript
   export interface NewEvent {
     event: 'new_event_name'
     properties: BaseEventProperties & {
       custom_field: string
     }
   }

   // Add to union type
   export type AnalyticsEvent = ... | NewEvent
   ```

3. **Validate at Runtime**: Use Zod or similar for API payloads
   ```typescript
   const eventSchema = z.object({
     event: z.literal('ticket_purchased'),
     properties: z.object({
       ticket_id: z.string(),
       // ... other fields
     }),
   })
   ```

---

## Adding New Events

### Step 1: Define Event Type

Add your event to `src/lib/analytics/events.ts`:

```typescript
export interface MyNewEvent {
  event: 'my_new_event'
  properties: BaseEventProperties & {
    custom_field: string
    custom_number: number
  }
}

// Add to union type
export type AnalyticsEvent =
  | PageViewedEvent
  // ... other events
  | MyNewEvent
```

### Step 2: Track Event

```typescript
import { analytics } from '@/lib/analytics'

analytics.track('my_new_event', {
  custom_field: 'value',
  custom_number: 42,
})
```

### Step 3: Create Insights

1. Go to PostHog
2. Create a new insight for your event
3. Add to relevant dashboards

---

## Troubleshooting

### Events Not Showing in PostHog

1. Check PostHog API key in `.env`
2. Verify `capture_pageview` and other settings
3. Check browser console for errors
4. Verify reverse proxy configuration in `next.config.ts`

### Server Events Not Tracked

1. Ensure `await serverAnalytics.flush()` is called
2. Check PostHog API key
3. Verify network connectivity to PostHog EU endpoint

### Type Errors

1. Regenerate TypeScript types if database schema changed
2. Ensure all event properties match defined interfaces
3. Check for typos in event names

---

## Migration from Console.log

### Before (Old Code)

```typescript
console.log('[Webhook] Processing checkout:', session.id)
console.log('[Webhook] Payment status:', session.payment_status)
console.error('[Webhook] Failed to create ticket:', error)
```

### After (New Code)

```typescript
const log = logger.scope('Webhook', { sessionId: session.id })

log.info('Processing checkout', {
  paymentStatus: session.payment_status,
})

log.error('Failed to create ticket', error, {
  type: 'payment',
  severity: 'critical',
})
```

---

## Resources

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog Revenue Analytics](https://posthog.com/docs/web-analytics/revenue-analytics)
- [PostHog Next.js Integration](https://posthog.com/docs/libraries/next-js)
- [Event Tracking Best Practices](https://posthog.com/docs/data/events)

---

## Support

For questions or issues:

1. Check this documentation
2. Review PostHog documentation
3. Check implementation examples in the codebase
4. Ask the team
