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
- **Code Quality**: ESLint, Husky, lint-staged

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

- Node.js 20+
- npm or yarn
- Supabase account
- Stripe account
- Resend account (for emails)

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repo-url>
   cd zurichjs-conf
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Fill in your credentials in `.env.local`:
   - Supabase URL and keys
   - Stripe keys and webhook secret
   - Resend API key

3. **Set up Supabase**
   ```bash
   # Install Supabase CLI
   npm install -g supabase

   # Link to your project
   supabase link --project-ref your-project-ref

   # Apply migrations
   supabase db push
   ```

4. **Configure Stripe**
   - Create products and prices in Stripe Dashboard
   - Set up webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Add webhook secret to `.env.local`

5. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

6. **Test webhooks locally** (optional)
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

## Documentation

- **[Documentation Index](./docs/README.md)** - All project documentation
- **[Analytics & Logging](./docs/ANALYTICS_AND_LOGGING.md)** - PostHog integration and structured logging
- **[Supabase Branching](./docs/SUPABASE_BRANCHING.md)** - Testing migrations on a staging branch before production
- **[CFP Improvements](./docs/CFP_IMPROVEMENTS.md)** - Roadmap for CFP system
- **[CLAUDE.md](./CLAUDE.md)** - AI assistant quick reference
- **[.cursorrules](./.cursorrules)** - Detailed coding standards

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking
npm run email:dev    # Preview email templates
```

### Code Quality

- Pre-commit hooks run linting and type checking
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
