# ZurichJS Conference Documentation

## Documentation Index

### Analytics & Logging
- **[Quick Start Guide](./ANALYTICS_QUICK_START.md)** - Get up and running in 5 minutes
- **[Full Analytics Guide](./ANALYTICS_AND_LOGGING.md)** - Complete analytics/logging documentation
- **[Migration Example](./MIGRATION_EXAMPLE.md)** - Migrate from console.log to structured logging
- **[Component Examples](./COMPONENT_INTEGRATION_EXAMPLES.md)** - Real-world React integration examples

### CFP System
- **[CFP Improvements](./CFP_IMPROVEMENTS.md)** - Roadmap for CFP system enhancements

### Debugging
- **[Voucher Emails Debug](./DEBUG_VOUCHER_EMAILS.md)** - Debugging voucher email issues

## Project Architecture

### Directory Structure
```
src/
├── pages/              # Next.js pages and API routes
│   ├── api/           # Backend API endpoints
│   ├── cfp/           # Call for Papers pages (speaker portal)
│   ├── admin/         # Admin interface
│   ├── account/       # User account pages
│   └── workshops/     # Workshop catalog
├── lib/               # Domain logic and infrastructure
│   ├── analytics/     # PostHog client/server tracking
│   ├── cfp/           # CFP business logic
│   ├── logger/        # Structured logging
│   ├── supabase/      # Database client
│   ├── stripe/        # Payment integration
│   └── types/         # TypeScript types
├── components/        # React components (Atomic Design)
│   ├── atoms/         # Base building blocks
│   ├── molecules/     # Composite components
│   ├── organisms/     # Complex page sections
│   ├── cfp/           # CFP-specific components
│   └── admin/         # Admin-specific components
├── hooks/             # Custom React hooks
├── contexts/          # React contexts
└── data/              # Static data
```

### Key Patterns

**Atomic Design**: Components organized as atoms (Button, Heading) → molecules (Card, Form) → organisms (Hero, Dashboard)

**Domain-Driven**: Code organized by domain (cfp, tickets, workshops) not technical layer

**Type Safety**: Strict TypeScript with generated Supabase types

**File Size Limit**: Components should stay under 500 lines; extract into separate files when needed

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (Pages Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Payments | Stripe |
| Email | Resend + React Email |
| Styling | Tailwind CSS v4 |
| State | TanStack Query |
| Analytics | PostHog (EU) |
| Icons | lucide-react |

## Environment Variables

Required environment variables (see `.env.example`):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Resend
RESEND_API_KEY=

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test:run     # Run tests
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run email:dev    # Preview email templates
```

## Related Files

- **[CLAUDE.md](../CLAUDE.md)** - AI assistant quick reference
- **[.cursorrules](../.cursorrules)** - Detailed coding standards
- **[README.md](../README.md)** - Project overview
