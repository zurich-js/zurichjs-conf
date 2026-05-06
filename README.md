# ZurichJS Conference 2026

A production-ready conference ticketing and workshop management platform built with Next.js, Supabase, and Stripe.

## Features

- 🎫 **Ticket Sales**: Multiple ticket types with dynamic pricing stages
- 🎓 **Workshops**: Workshop catalog with registration and capacity management
- 👤 **User Accounts**: Profile management, ticket history, workshop registrations
- 💳 **Secure Payments**: Stripe integration with webhook handling
- 🔐 **Authentication**: Supabase Auth with role-based access control
- 🔒 **Row Level Security**: Database-level security with RLS policies
- 📧 **Email Notifications**: Automated confirmation emails with React Email
- 🎨 **Modern UI**: Tailwind CSS with Atomic Design components
- 📱 **Responsive**: Mobile-first design approach

## Tech Stack

- **Framework**: Next.js 15 (Pages Router)
- **Database & Auth**: Supabase
- **Payments**: Stripe
- **Email**: Resend with React Email
- **Styling**: Tailwind CSS v4
- **State Management**: React Query, Context API
- **Type Safety**: TypeScript (strict mode)
- **Code Quality**: Docker-only local execution with CI validation

## Project Structure

```
src/
├── pages/              # Next.js pages and API routes
│   ├── api/           # Backend API endpoints
│   ├── auth/          # Authentication pages (login, signup)
│   ├── account/       # User account pages
│   ├── workshops/     # Workshop catalog and details
│   └── admin/         # Admin interface
├── lib/               # Domain logic and infrastructure
│   ├── supabase/      # Supabase client and auth
│   ├── stripe/        # Stripe integration
│   ├── users/         # User management
│   ├── tickets/       # Ticket operations
│   ├── workshops/     # Workshop management
│   ├── roles/         # Role-based access control
│   └── types/         # TypeScript types
├── components/        # React components (Atomic Design)
│   ├── atoms/         # Basic building blocks
│   ├── molecules/     # Composite components
│   └── organisms/     # Complex components
├── config/            # Configuration files
├── emails/            # Email templates
└── data/              # Static data

supabase/
├── migrations/        # Database migrations (SQL)
└── config.toml        # Supabase configuration

docs/
├── architecture.md    # System architecture
├── IMPLEMENTATION_STATUS.md  # Implementation progress
└── [other docs]       # Additional documentation
```

## Quick Start

### Prerequisites

- Docker
- just
- Supabase account
- Stripe account
- Resend account (for emails)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd zurichjs-conf
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   `just setup` can build/install/start Supabase before these are filled in.
   If any values needed by the dev server are missing, setup prints a clear
   message and leaves Supabase running without starting the frontend.
   Fill these in before running the app or production checks:
   - Supabase URL and keys
   - Stripe keys and webhook secret
   - Resend API key

3. **Build containers, install dependencies, and start services**
   ```bash
   just setup
   ```

   `just setup` runs in detached mode. If containers were previously stopped
   with `docker compose down`, run either `just setup` or `just dev` to bring
   the local stack back.

4. **Configure Stripe**
   - Create products and prices in Stripe Dashboard
   - Set up webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Add webhook secret to `.env.local`

5. **Run development server**
   ```bash
   just dev
   ```

   Open the URL from `NEXT_PUBLIC_BASE_URL`.

6. **Test webhooks locally** (optional)
   ```bash
   stripe listen --forward-to <host-and-port-from-NEXT_PUBLIC_BASE_URL>/api/webhooks/stripe
   ```

## Documentation

- **[Documentation Index](./docs/README.md)** - All project documentation
- **[Analytics & Logging](./docs/ANALYTICS_AND_LOGGING.md)** - PostHog integration and structured logging
- **[CFP Improvements](./docs/CFP_IMPROVEMENTS.md)** - Roadmap for CFP system
- **[CLAUDE.md](./CLAUDE.md)** - AI assistant quick reference
- **[.cursorrules](./.cursorrules)** - Detailed coding standards

## Development

### Available Scripts

```bash
just dev            # Start Supabase and the Dockerized development server
just env-check      # Verify process.env usage is covered by .env.example
just build          # Build for production inside Docker
just lint           # Run linting inside Docker
just typecheck      # Run TypeScript type checking inside Docker
just test           # Run tests inside Docker
just check          # Run env-check, lint, typecheck, and tests inside Docker
just email-dev      # Preview email templates inside Docker
```

Direct host-side `pnpm`, `npm`, `npx`, and Supabase CLI workflows are blocked
for this repository. Use `just ...` or `docker compose run --rm tools ...`.
Host-side Git commands are fine.

`NEXT_PUBLIC_BASE_URL` is the source of truth for the local app endpoint. For
example, setting `NEXT_PUBLIC_BASE_URL=http://localhost:4000` in `.env.local`
makes `just dev` publish port 4000 and start Next.js on port 4000.

### Docker-Only Security Model

Local app commands are blocked to prevent dependency lifecycle scripts, hidden
config evaluation, or unexpected build tooling from running directly on the
developer machine. Dependency installation, Next.js, PostCSS, tests, linting,
Supabase migrations, and all package scripts must run in Docker.

Common direct commands:

```bash
docker compose run --rm tools pnpm test:run
docker compose run --rm tools pnpm typecheck
docker compose run --rm tools pnpm lint
docker compose run --rm tools supabase status
```

Remote Supabase CLI work is still supported through Docker:

```bash
just supabase status
just supabase migration list --linked
just supabase db push --linked
```

Provide any required Supabase credentials through `.env.local` or the shell
environment passed to Docker, for example `SUPABASE_ACCESS_TOKEN`.

`SUPABASE_ACCESS_TOKEN` is only for Supabase CLI authentication.

For hosted Supabase, use:

```env
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

For local Supabase CLI, use the local keys printed by `just supabase status`.
Keep the same env var names; only the values change:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local Publishable key>
SUPABASE_SECRET_KEY=<local Secret key>
```

Do not put the publishable key in `SUPABASE_SECRET_KEY`.

### Code Quality

- GitHub Actions runs linting, tests, type checking, coverage, and builds
- Strict TypeScript configuration
- ESLint with Next.js recommended rules

## Architecture Highlights

### Domain-Driven Design

The codebase is organized by domain (users, tickets, workshops, roles) rather than by technical layer. Each domain exposes clean, typed interfaces.

### Type Safety

Full TypeScript coverage with:
- Database schema types
- API request/response types
- Domain model types
- Strict null checking

### Security

- Row Level Security (RLS) on all tables
- Role-based access control (attendee, speaker, admin)
- Secure webhook signature verification
- Environment variable validation

### Idempotency

All write operations are idempotent:
- Ticket creation checks for existing records by session ID
- User profile creation is upsert-based
- Webhook handlers can be safely retried

## User Roles

- **Attendee**: Can purchase tickets and register for workshops
- **Speaker**: Attendee permissions + can manage own workshops
- **Admin**: Full access to all resources

## Deployment

See [deployment.md](./docs/deployment.md) for detailed instructions.

Quick deploy to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/zurichjs-conf)

**Important**:
- Set all environment variables in Vercel
- Apply database migrations to production Supabase
- Configure Stripe webhook URL to production endpoint

## Contributing

This is a private conference platform. For questions or issues, contact the development team.

## License

Private - All rights reserved
