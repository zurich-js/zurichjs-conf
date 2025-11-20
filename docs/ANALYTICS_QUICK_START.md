# Analytics & Logging Quick Start Guide

## Overview

This guide will get you started with the analytics and logging system in 5 minutes.

## Installation

The system is already installed! PostHog is configured and ready to use.

## Basic Usage

### 1. Tracking Page Views

Page views are automatically tracked. No action needed!

### 2. Track User Actions (Client-Side)

```typescript
import { analytics } from '@/lib/analytics/client'

// In a button click handler
<button
  onClick={() => {
    analytics.track('button_clicked', {
      button_text: 'Buy Tickets',
      button_location: 'hero',
      button_action: 'navigate_tickets',
    })
    router.push('/tickets')
  }}
>
  Buy Tickets
</button>
```

### 3. Track Cart Events

```typescript
import { trackTicketAddedToCart } from '@/lib/analytics'

function addToCart() {
  // Add to cart logic...

  trackTicketAddedToCart({
    category: 'standard',
    stage: 'early_bird',
    price: 4900,
    quantity: 1,
  })
}
```

### 4. Logging (Replace console.log)

```typescript
import { logger } from '@/lib/logger'

// Instead of console.log
logger.info('User logged in', { userId: '123' })

// Instead of console.error
logger.error('Failed to load data', error, {
  type: 'network',
  severity: 'medium',
})
```

### 5. Server-Side Analytics (API Routes / Webhooks)

```typescript
import { serverAnalytics } from '@/lib/analytics/server'
import { logger } from '@/lib/logger'

export default async function handler(req, res) {
  const log = logger.scope('API')

  try {
    // Your logic...

    await serverAnalytics.track('ticket_purchased', userEmail, {
      ticket_id: 'ticket_123',
      ticket_category: 'standard',
      ticket_stage: 'early_bird',
      ticket_price: 4900,
      currency: 'CHF',
      ticket_count: 1,
      // Required revenue properties
      revenue_amount: 4900,
      revenue_currency: 'CHF',
      revenue_type: 'ticket',
      transaction_id: 'tx_123',
    })

    // IMPORTANT: Flush before response
    await serverAnalytics.flush()

    log.info('Ticket created successfully', { ticketId: 'ticket_123' })
    res.status(200).json({ success: true })
  } catch (error) {
    log.error('Failed to create ticket', error, {
      type: 'system',
      severity: 'critical',
    })
    res.status(500).json({ error: 'Failed to create ticket' })
  }
}
```

## Common Patterns

### Track Form Submission

```typescript
import { analytics } from '@/lib/analytics'

const onSubmit = async (data) => {
  try {
    await submitForm(data)

    analytics.track('form_submitted', {
      form_name: 'checkout',
      form_type: 'checkout',
      form_success: true,
    })
  } catch (error) {
    analytics.track('form_error', {
      form_name: 'checkout',
      error_message: error.message,
      error_type: 'validation',
      error_severity: 'low',
    })
  }
}
```

### Track User Identification

```typescript
import { analytics } from '@/lib/analytics'

// After login/signup
analytics.identify(user.id, {
  email: user.email,
  name: user.name,
  company: user.company,
})
```

### Scoped Logging

```typescript
import { logger } from '@/lib/logger'

function MyComponent() {
  const log = logger.scope('MyComponent')

  useEffect(() => {
    log.info('Component mounted')
    return () => log.debug('Component unmounting')
  }, [])

  const handleClick = () => {
    log.info('Button clicked', { action: 'submit' })
  }
}
```

## Viewing Analytics

1. Go to [PostHog EU](https://eu.posthog.com)
2. Log in with your credentials
3. Navigate to **Insights** to create dashboards
4. Check **Activity** to see live events

## Key Files

- **Event Types**: `src/lib/analytics/events.ts`
- **Client Analytics**: `src/lib/analytics/client.ts`
- **Server Analytics**: `src/lib/analytics/server.ts`
- **Logger**: `src/lib/logger/index.ts`
- **Helpers**: `src/lib/analytics/helpers.ts`

## Next Steps

1. Read the [full documentation](./ANALYTICS_AND_LOGGING.md)
2. Review the [migration example](./MIGRATION_EXAMPLE.md)
3. Start replacing console.log statements
4. Create PostHog insights for your events

## Environment Variables

Already configured in `.env`:

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_7xPZ4RzoiemcwSAgFC1vgkAlQduJKje34DOWdw1a7eu
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

## Important Notes

- ✅ **Always flush** server-side analytics before function exits
- ✅ **Use type-safe** event tracking (autocomplete works!)
- ✅ **Include context** in all logs
- ❌ **Never track** passwords or sensitive data
- ❌ **Don't overtrack** - be selective about what matters

## Support

Questions? Check:
1. [Full documentation](./ANALYTICS_AND_LOGGING.md)
2. [Migration examples](./MIGRATION_EXAMPLE.md)
3. [PostHog docs](https://posthog.com/docs)
