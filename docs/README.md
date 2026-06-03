# ZurichJS Conference Documentation

## Documentation Index

### AI Agents
- **[Agent Playbooks](./AGENT_PLAYBOOKS.md)** - Recipes for common tasks (new API route, new migration, etc.)
- **[../CLAUDE.md](../CLAUDE.md)** - Canonical AI-agent rulebook (with scoped CLAUDE.md files in every major directory)

### Analytics & Logging
- **[Quick Start Guide](./ANALYTICS_QUICK_START.md)** - Get up and running in 5 minutes
- **[Full Analytics Guide](./ANALYTICS_AND_LOGGING.md)** - Complete analytics/logging documentation
- **[Migration Example](./MIGRATION_EXAMPLE.md)** - Migrate from console.log to structured logging
- **[Component Examples](./COMPONENT_INTEGRATION_EXAMPLES.md)** - Real-world React integration examples

### CFP System
- **[CFP Improvements](./CFP_IMPROVEMENTS.md)** - Roadmap for CFP system enhancements

### Workshops
- **[Workshops Summary](./WORKSHOPS_SUMMARY.md)** - Workshop subsystem overview

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

Required environment variables are defined in `.env.schema`. Local development
loads secret values from `.env.1password` through the 1Password CLI; do not
create a plaintext `.env.local` for normal local work.

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

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
just setup               # Validate first-run prerequisites and start Docker dev
just up                  # Start Docker dev detached on http://localhost:3003
just down                # Stop local Docker dev and Supabase containers
just check               # Varlock + lint + typecheck + related tests
just lint                # Run oxlint --fix inside Docker
just typecheck           # TypeScript check inside Docker
just test-related <file> # Run related Vitest tests inside Docker
just test                # Run full Vitest suite inside Docker
just build               # Build for production inside Docker
```

## Related Files

- **[CLAUDE.md](../CLAUDE.md)** - AI assistant quick reference
- **[.cursorrules](../.cursorrules)** - Detailed coding standards
- **[README.md](../README.md)** - Project overview
