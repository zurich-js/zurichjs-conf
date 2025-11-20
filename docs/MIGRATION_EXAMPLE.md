# Migration Example: Webhook Handler

This document shows how to migrate from console.log to the new structured logging and analytics system.

## Before (Old Code)

```typescript
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  console.log('[WebhookHandler] ====== Processing checkout.session.completed ======');
  console.log('[WebhookHandler] Session ID:', session.id);
  console.log('[WebhookHandler] Payment status:', session.payment_status);
  console.log('[WebhookHandler] Session status:', session.status);

  const stripe = getStripeClient();

  // Extract customer information
  const customerEmail = session.customer_details?.email;
  const customerName = session.customer_details?.name || 'Valued Customer';

  console.log('[WebhookHandler] Customer details:', {
    email: customerEmail,
    name: customerName,
  });

  if (!customerEmail) {
    console.error('[WebhookHandler] ❌ No customer email found in checkout session');
    throw new Error('Customer email is required');
  }

  // ... more code ...

  try {
    // Process tickets
    console.log('[WebhookHandler] Creating ticket in database...');
    const ticket = await createTicket(ticketData);
    console.log('[WebhookHandler] ✅ Ticket created successfully:', ticket.id);
  } catch (error) {
    console.error('[WebhookHandler] ❌ Failed to create ticket:', error);
    throw error;
  }
}
```

## After (New Code)

```typescript
import { logger } from '@/lib/logger'
import {
  trackTicketPurchaseServer,
  trackWorkshopVoucherPurchaseServer,
  trackWebhookReceivedServer,
  identifyUserServer,
} from '@/lib/analytics'

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  // Create scoped logger with context
  const log = logger.scope('WebhookHandler', {
    sessionId: session.id,
    eventType: 'checkout.session.completed',
  })

  const startTime = Date.now()

  // Log start of processing
  log.info('Processing checkout session', {
    paymentStatus: session.payment_status,
    sessionStatus: session.status,
  })

  const stripe = getStripeClient()

  // Extract customer information
  const customerEmail = session.customer_details?.email
  const customerName = session.customer_details?.name || 'Valued Customer'

  log.debug('Extracted customer details', {
    email: customerEmail,
    name: customerName,
  })

  if (!customerEmail) {
    log.error('Customer email missing from checkout session', undefined, {
      type: 'validation',
      severity: 'critical',
      code: 'MISSING_EMAIL',
    })
    throw new Error('Customer email is required')
  }

  // ... more code ...

  try {
    // Process tickets
    log.info('Creating ticket in database', {
      category: ticketData.category,
      stage: ticketData.stage,
    })

    const ticket = await createTicket(ticketData)

    log.info('Ticket created successfully', {
      ticketId: ticket.id,
      attendeeName: `${ticketData.firstName} ${ticketData.lastName}`,
    })

    // Track analytics
    await trackTicketPurchaseServer({
      distinctId: customerEmail,
      ticketId: ticket.id,
      category: ticketInfo.category,
      stage: ticketInfo.stage,
      price: amountPaid,
      currency: currency,
      attendeeCount: 1,
      stripeSessionId: session.id,
      stripeCustomerId: stripeCustomerId,
      paymentIntentId: session.payment_intent as string,
      email: customerEmail,
      firstName: ticketData.firstName,
      lastName: ticketData.lastName,
    })

    // Identify user in PostHog
    await identifyUserServer({
      userId: customerEmail,
      email: customerEmail,
      firstName: ticketData.firstName,
      lastName: ticketData.lastName,
      company: ticketData.company,
      jobTitle: ticketData.jobTitle,
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

    log.info('Checkout processing completed', {
      ticketId: ticket.id,
      processingTimeMs: processingTime,
    })

    // Flush analytics before function exits
    await serverAnalytics.flush()

  } catch (error) {
    log.error('Failed to create ticket', error, {
      type: 'system',
      severity: 'critical',
      code: 'TICKET_CREATION_FAILED',
      category: ticketData.category,
      stage: ticketData.stage,
    })

    // Track failed webhook
    await trackWebhookReceivedServer({
      distinctId: 'system',
      webhookSource: 'stripe',
      webhookEventType: 'checkout.session.completed',
      webhookId: session.id,
      success: false,
    })

    await serverAnalytics.flush()
    throw error
  }
}
```

## Key Changes

### 1. **Scoped Logger**
- Created logger with module context
- All logs automatically include `module: 'WebhookHandler'` and `sessionId`

### 2. **Structured Context**
- Instead of: `console.log('[WebhookHandler] Session ID:', session.id)`
- Use: `log.info('Processing checkout', { sessionId: session.id })`
- Provides consistent, parseable structure

### 3. **Log Levels**
- `debug`: Development-only detailed flow (replaces verbose console.logs)
- `info`: Important state changes
- `warn`: Recoverable issues
- `error`: Failures requiring attention

### 4. **Error Tracking**
- Errors include type, severity, and code
- Automatically tracked in PostHog
- Stack traces captured

### 5. **Analytics Integration**
- Track business events (ticket purchase, revenue)
- Identify users in PostHog
- Track webhook processing metrics
- Always flush before function exits

## Console.log → Logger Migration Map

| Old Pattern | New Pattern |
|-------------|-------------|
| `console.log('[Module] Message')` | `log.info('Message')` |
| `console.log('[Module] Details:', obj)` | `log.info('Details', obj)` |
| `console.debug('[Module] Debug:', val)` | `log.debug('Debug info', { val })` |
| `console.warn('[Module] Warning:', msg)` | `log.warn('Warning message', { msg })` |
| `console.error('[Module] Error:', error)` | `log.error('Error message', error)` |
| `console.log('[Module] ✅ Success')` | `log.info('Operation successful')` |
| `console.log('[Module] ❌ Failed')` | `log.error('Operation failed', error)` |
| `console.log('[Module] ⚠️ Warning')` | `log.warn('Warning condition')` |

## Benefits

### Development
- **Rich formatting** with emojis and colors
- **Context visible** at a glance
- **Easier debugging** with structured data

### Production
- **JSON format** for log aggregation
- **PostHog integration** for error monitoring
- **Searchable metadata** in logging systems
- **Performance metrics** (processing time)
- **Revenue tracking** for business insights

### Type Safety
- **Compile-time checks** for event properties
- **Autocomplete** in IDE
- **Refactoring support** when changing event structure
- **Documentation** through types
