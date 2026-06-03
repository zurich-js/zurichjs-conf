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
- **Code Quality**: oxlint, Vitest, TypeScript, Varlock

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

- Docker Desktop, or Docker Engine with Docker Compose v2
- 1Password CLI (`op`) installed, signed in, and authorized for the shared local
  development secrets
- Just command runner (`just`)

You do not need Node, pnpm, or the Supabase CLI installed on the host for the
normal Docker workflow. Docker provides Node 22, Corepack activates pnpm 11, and
the Supabase CLI is run through Docker when it is not installed locally.

You may need direct Supabase, Stripe, or Resend account access for provider
configuration, production work, or changing shared secrets. Booting the local app
only requires access to the 1Password item referenced by `.env.1password`.

Local Supabase exposes its own publishable/anon and service-role keys when the
CLI starts the containers. These local development keys can be shared through
1Password as long as they match the local Supabase configuration. Do not put
production Supabase service-role keys in the local development item.

### Installation

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd zurichjs-conf
   ```

2. **Set up 1Password references**

   Local secrets are read through `.env.1password`, which contains committed
   `op://` references only. Create matching items/fields in 1Password or update
   the references to your vault/item names. Do not create a plaintext `.env.local`
   for local development.

3. **Run first-time setup**

   ```bash
   just setup
   ```

   This checks Docker, Docker Compose v2, `op`, `just`, 1Password access, and
   required secret references before starting the Docker development environment.
   It also installs Node dependencies inside the Docker volume.

4. **Authenticate Supabase CLI inside Docker when needed**

   ```bash
   just supabase-login
   ```

   This is only needed when the Supabase CLI asks you to log in, or when you need
   cloud-linked Supabase commands. It runs `supabase login` inside the Dockerized
   CLI container and stores the CLI credential in the `supabase-cli` Docker
   volume.

5. **Run the Docker development environment after setup**
   ```bash
   just up
   ```

   This runs `op run --env-file=.env.1password -- docker compose ...`, starts
   Supabase by running the Supabase CLI inside a Node container, installs
   dependencies inside the Node app container, and starts Next.js on
   [http://localhost:3003](http://localhost:3003).
   The dev script also clears any stale `public.ecr.aws` Docker credential before
   startup because the Supabase CLI pulls local service images from Public ECR.

6. **Configure Stripe**
   - Create products and prices in Stripe Dashboard
   - Set up webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Store the webhook secret in the 1Password item referenced by `.env.1password`

7. **Stop the Docker development environment**
   ```bash
   just down
   ```

8. **Test webhooks locally** (optional)
   ```bash
   stripe listen --forward-to localhost:3003/api/webhooks/stripe
   ```

## Documentation

- **[Documentation Index](./docs/README.md)** - All project documentation
- **[Analytics & Logging](./docs/ANALYTICS_AND_LOGGING.md)** - PostHog integration and structured logging
- **[CFP Improvements](./docs/CFP_IMPROVEMENTS.md)** - Roadmap for CFP system
- **[CLAUDE.md](./CLAUDE.md)** - AI assistant quick reference
- **[.cursorrules](./.cursorrules)** - Detailed coding standards

## Development

### Available Scripts

Local environment:

```bash
just setup           # Validate first-run prerequisites and start local Docker dev
just up              # Start local Docker dev detached with 1Password injection
just down            # Stop local Docker dev and Supabase containers
just shell           # Open a shell in the Node container
just supabase-login  # Log the Dockerized Supabase CLI in, only when needed
```

Common checks:

```bash
just check                 # Varlock + lint + typecheck + related tests
just lint                  # Run oxlint --fix inside Docker
just typecheck             # Run TypeScript type checking inside Docker
just test-related <files>  # Run related Vitest tests inside Docker
```

Broader checks:

```bash
just test        # Run the full Vitest suite inside Docker
just build       # Run production Next.js build inside Docker
just check-full  # Varlock + lint + typecheck + full tests + build
```

Local seed phases:

```bash
just seed-cfp-first-stage    # Reset local Supabase for first-stage CFP review
just seed-cfp-admission      # Reset local Supabase for admission decisions
just seed-cfp-schedule       # Reset local Supabase for scheduling
just seed-workshop-commerce  # Reset local Supabase with workshop commerce data
```

Backward-compatible aliases:

```bash
just dev          # Alias for just up
just docker-up    # Alias for just up
just docker-dev   # Alias for just up
just docker-down  # Alias for just down
```

### Code Quality

- Environment schema validation is handled by Varlock
- Strict TypeScript configuration
- oxlint for linting
- `pnpm install` and package scripts are guarded so local installs, checks, and
  builds run through Docker or CI

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
