# ZurichJS Conference Analytics & Logging Documentation

Welcome to the comprehensive analytics and logging system documentation!

## 📚 Documentation Index

### Getting Started

- **[Quick Start Guide](./ANALYTICS_QUICK_START.md)** - Get up and running in 5 minutes
- **[Migration Example](./MIGRATION_EXAMPLE.md)** - See how to migrate from console.log
- **[Component Integration](./COMPONENT_INTEGRATION_EXAMPLES.md)** - Real-world React examples

### Complete Documentation

- **[Full Analytics & Logging Guide](./ANALYTICS_AND_LOGGING.md)** - Complete system documentation

## 🎯 What's Included

### Analytics System

- ✅ **Type-safe event tracking** with full TypeScript support
- ✅ **Client & server-side** analytics (browser + Node.js)
- ✅ **Revenue tracking** for conversion analysis
- ✅ **User identification** and properties
- ✅ **50+ predefined events** for common actions
- ✅ **Helper functions** for quick integration
- ✅ **PostHog integration** with EU hosting

### Logging System

- ✅ **Structured logging** with contextual metadata
- ✅ **Multiple log levels** (debug, info, warn, error)
- ✅ **Scoped loggers** for modules/components
- ✅ **PostHog error tracking** integration
- ✅ **Development vs production** behavior
- ✅ **Type-safe** error categorization

## 🚀 Quick Examples

### Track an Event

```typescript
import { analytics } from '@/lib/analytics/client'

analytics.track('ticket_added_to_cart', {
  ticket_category: 'standard',
  ticket_stage: 'early_bird',
  ticket_price: 4900,
  currency: 'CHF',
  ticket_count: 1,
  quantity: 1,
})
```

### Use Structured Logging

```typescript
import { logger } from '@/lib/logger'

const log = logger.scope('MyComponent')

log.info('User action completed', {
  userId: '123',
  action: 'purchase',
})

log.error('Operation failed', error, {
  type: 'payment',
  severity: 'critical',
})
```

### Track Revenue (Server)

```typescript
import { serverAnalytics } from '@/lib/analytics/server'

await serverAnalytics.revenue(userId, {
  amount: 4900,
  currency: 'CHF',
  type: 'ticket',
  transactionId: 'tx_123',
  productName: 'Early Bird Ticket',
})

await serverAnalytics.flush() // Important!
```

## 📊 PostHog Insights

The system tracks:

- **Revenue Analytics**: Total revenue, revenue by ticket type, average order value
- **Conversion Funnels**: Ticket purchase flow, workshop registration
- **User Engagement**: Button clicks, form submissions, page views
- **Error Monitoring**: Errors by type, severity, and frequency
- **Checkout Metrics**: Cart abandonment, payment success rate

See [full documentation](./ANALYTICS_AND_LOGGING.md#posthog-insights) for creating insights.

## 🏗️ Architecture

```
src/lib/
├── analytics/
│   ├── events.ts       # Event type definitions (50+ events)
│   ├── client.ts       # Browser analytics client
│   ├── server.ts       # Node.js analytics client
│   ├── helpers.ts      # Convenience functions
│   └── index.ts        # Central exports
│
└── logger/
    └── index.ts        # Structured logging system
```

## 🎓 Event Categories

### Ticket Events
- `ticket_viewed`, `ticket_added_to_cart`, `ticket_removed_from_cart`
- `ticket_purchased`, `ticket_transferred`, `ticket_validated`, `ticket_checked_in`

### Workshop Events
- `workshop_viewed`, `workshop_voucher_purchased`
- `workshop_registered`, `workshop_cancelled`

### Checkout & Payment Events
- `checkout_started`, `checkout_completed`, `checkout_abandoned`
- `payment_succeeded`, `payment_failed`

### Engagement Events
- `button_clicked`, `form_submitted`, `form_error`, `link_clicked`
- `search_performed`, `filter_applied`, `share_clicked`

### System Events
- `error_occurred`, `api_error`, `webhook_received`

See [events.ts](../src/lib/analytics/events.ts) for all 50+ events.

## 🔒 Privacy & Security

- ✅ Sensitive data automatically sanitized
- ✅ EU-hosted PostHog instance
- ✅ Reverse proxy configured (`/ingest` endpoint)
- ✅ Form input masking enabled
- ✅ GDPR-compliant data handling

## 📈 Current Status

### Implemented
- ✅ Complete type-safe event system
- ✅ Client-side analytics wrapper
- ✅ Server-side analytics wrapper
- ✅ Structured logging system
- ✅ Helper functions
- ✅ Comprehensive documentation
- ✅ Migration examples

### Next Steps
1. Migrate console.log statements to logger (294 instances)
2. Add analytics tracking to components
3. Create PostHog dashboards
4. Set up alerts for critical errors

## 🛠️ Migration Guide

### Console.log → Logger

| Before | After |
|--------|-------|
| `console.log('[Module] Message')` | `log.info('Message')` |
| `console.error('[Module] Error', err)` | `log.error('Error message', err)` |
| `console.debug('[Module] Debug')` | `log.debug('Debug message')` |

See [Migration Example](./MIGRATION_EXAMPLE.md) for detailed walkthrough.

## 📞 Support

- Read the documentation in this folder
- Check [PostHog docs](https://posthog.com/docs)
- Review code examples in components
- Ask the team for help

## 🎯 Best Practices

1. **Track early**: Track analytics BEFORE performing actions
2. **Be specific**: Use descriptive event names
3. **Include context**: Always add relevant metadata
4. **Type safety**: Let TypeScript guide you
5. **Flush server events**: Always flush in serverless functions
6. **Error handling**: Log errors with appropriate severity
7. **User privacy**: Never track sensitive data

## 📖 Additional Resources

- [PostHog Revenue Analytics](https://posthog.com/docs/web-analytics/revenue-analytics)
- [PostHog Next.js Guide](https://posthog.com/docs/libraries/next-js)
- [Event Tracking Best Practices](https://posthog.com/docs/data/events)

---

**Questions?** Start with the [Quick Start Guide](./ANALYTICS_QUICK_START.md)!
