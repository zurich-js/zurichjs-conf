# Claude Code Project Guide

ZurichJS Conference 2026 — a ticketing, CFP, and admin platform built with Next.js, Supabase, and Stripe.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (Pages Router) | 16.x |
| Language | TypeScript (strict) | 5.x |
| Database / Auth | Supabase (PostgreSQL 17) | 2.x |
| Payments | Stripe | 19.x |
| Styling | Tailwind CSS v4 (CSS-first config) | 4.x |
| Server State | TanStack Query | 5.x |
| Forms | React Hook Form + Zod | 7.x / 4.x |
| Animations | Framer Motion | 12.x |
| Email | React Email + Resend | — |
| Analytics | PostHog | — |
| Error Tracking | Sentry | 10.x |
| Icons | lucide-react | — |
| Testing | Vitest | 4.x |

## Directory Structure

```
src/
├── components/        # React components (Atomic Design)
│   ├── atoms/         # Base primitives (Button, Heading, Tag, Input, Modal…)
│   ├── molecules/     # Composite components (PriceCard, StatCard, TimelineCard…)
│   ├── organisms/     # Page sections (Hero, Footer, ScheduleSection…)
│   ├── cfp/           # CFP-specific components (submit wizard, reviewer dashboard)
│   ├── admin/         # Admin-specific components (speakers, CFP management)
│   ├── cart/          # Cart and checkout components
│   └── ui/            # Utility components
├── lib/               # Domain logic and utilities
│   ├── api/           # API client, config, response helpers
│   ├── cfp/           # CFP business logic (scoring, decisions, speakers)
│   ├── stripe/        # Payment integration (webhooks, checkout)
│   ├── tickets/       # Ticket creation, counts, validation
│   ├── discount/      # Discount popup, UTM lottery, config
│   ├── roles/         # RBAC guards and constants
│   ├── rate-limit/    # In-memory sliding window rate limiter
│   ├── validations/   # Zod schemas (cfp, checkout, social handles)
│   ├── supabase/      # Database clients and generated types
│   ├── analytics/     # PostHog client and server tracking
│   ├── email/         # Email utilities
│   ├── logger/        # Structured logging
│   └── types/         # Shared TypeScript types
├── pages/             # Next.js pages + API routes
│   ├── api/           # ~115 REST endpoints
│   ├── cfp/           # Call for Papers pages
│   ├── admin/         # Admin dashboards
│   └── account/       # User account pages
├── hooks/             # Custom React hooks (CFP, cart, checkout, discount)
├── contexts/          # React contexts (Cart, Currency, Motion, Toast)
├── emails/            # React Email templates + design tokens
├── data/              # Static content (hero, footer, sponsors, schedule)
├── styles/            # globals.css (Tailwind v4 @theme), ProfileCard.css
└── config/            # Currency, env, pricing stage config
```

## Coding Conventions

### Files & Naming

- **Max 500 lines** per file (ESLint warns at 550). Extract components early.
- Components: `PascalCase.tsx` (e.g., `Button.tsx`, `TimelineCard.tsx`)
- Hooks: `camelCase.ts` prefixed with `use` (e.g., `useCfpSubmissions.ts`)
- Data files: `camelCase.ts` (e.g., `hero.ts`, `schedule.ts`)
- Tests: `*.test.ts` or `*.test.tsx` in `__tests__/` directory next to source
- Every component directory **must** have an `index.ts` barrel export

### TypeScript Rules

- **No `any`** — use `unknown` with type guards
- **Interface over type** for component props
- **Explicit return types** on all exported functions
- **Export types** alongside components in barrel files
- **`as const`** for static data objects

### Component Architecture (Atomic Design)

| Level | Directory | Purpose | Rules |
|-------|-----------|---------|-------|
| Atoms | `components/atoms/` | Single-purpose UI primitives | No business logic, no data fetching |
| Molecules | `components/molecules/` | Combinations of atoms | Can manage internal state only |
| Organisms | `components/organisms/` | Complete page sections | Accept data as props, never fetch |

```typescript
// Example atom usage
import { Button, Heading } from '@/components/atoms';
import { Check } from 'lucide-react';

interface MyComponentProps {
  title: string;
  onSubmit: () => void;
}

export function MyComponent({ title, onSubmit }: MyComponentProps) {
  return (
    <div className="space-y-4">
      <Heading level="h1">{title}</Heading>
      <Button onClick={onSubmit} variant="primary">
        <Check className="w-4 h-4" />
        Submit
      </Button>
    </div>
  );
}
```

### API Route Patterns

Use the standardized response helpers from `@/lib/api/responses`:

```typescript
import { apiUnauthorized, apiValidationError, apiServerError, apiMethodNotAllowed } from '@/lib/api/responses';

// Auth check
if (!verifyAdminToken(token)) return apiUnauthorized(res);

// Validation
const result = schema.safeParse(req.body);
if (!result.success) return apiValidationError(res, result.error);

// Error handling
catch (error) {
  log.error('Failed to do X', error, { context });
  return apiServerError(res);
}

// Method guard
return apiMethodNotAllowed(res);
```

Other API conventions:
- Use Zod for request validation (schemas in `src/lib/validations/`)
- Wrap handlers in try/catch
- Use structured logging with `logger.scope('ScopeName')`
- Track analytics for user-facing events with `serverAnalytics.track()`

### State Management

- **TanStack Query** for server state (`useCfp*` hooks, `useCart*` hooks)
- **React Context** for UI state (CartContext, MotionContext, CurrencyContext, ToastContext)
- **URL state** via `nuqs` for shareable filters/pagination

## Design System

### Source of Truth

All design tokens are defined in `src/styles/globals.css` via Tailwind v4's `@theme` block. There is **no** `tailwind.config.ts` — Tailwind v4 uses CSS-first configuration.

### Color Tokens

Use Tailwind classes referencing CSS variable names — never hardcode hex values.

**Brand palette:**
| Token | Hex | Tailwind Class |
|-------|-----|----------------|
| `brand-primary` | `#F1E271` | `bg-brand-primary`, `text-brand-primary` |
| `brand-yellow-main` | `#F1E271` | `bg-brand-yellow-main` |
| `brand-yellow-secondary` | `#EDC936` | `bg-brand-yellow-secondary` |
| `brand-blue` | `#268BCC` | `bg-brand-blue` |
| `brand-orange` | `#EA561D` | `bg-brand-orange` |
| `brand-green` | `#31A853` | `bg-brand-green` |
| `brand-red` | `#ea1d35` | `bg-brand-red` |

**Surfaces (dark theme):**
| Token | Hex | Use |
|-------|-----|-----|
| `surface-page` | `#0A0A0A` | Page background |
| `surface-section` | `#19191B` | Section background |
| `surface-card` | `#242528` | Card background |
| `surface-card-hover` | `#2A2A2D` | Card hover state |
| `surface-elevated` | `#2F2F33` | Elevated elements |

**Text:**
| Token | Hex | Use |
|-------|-----|-----|
| `text-primary` | `#FFFFFF` | Headings, primary text |
| `text-secondary` | `#E5E7EB` | Body text |
| `text-tertiary` | `#CBD5E1` | Supporting text |
| `text-muted` | `#94A3B8` | De-emphasized text |
| `text-disabled` | `#64748B` | Disabled states |

**Semantic:**
| Token | Hex | Use |
|-------|-----|-----|
| `success` | `#22C55E` | Success states |
| `warning` | `#F97316` | Warning states |
| `error` | `#EF4444` | Error states |
| `info` | `#3B82F6` | Info states |

### Typography Scale

Defined in `@theme` block. Use Tailwind `text-*` classes:

| Class | Size | Use |
|-------|------|-----|
| `text-xxs` | 0.75rem | Tiny labels |
| `text-xs` | 0.875rem | Small text, badges |
| `text-sm` | 1rem | Body small |
| `text-base` | 1.125rem | Body default |
| `text-md` | 1.25rem | Subheadings |
| `text-lg` | 1.5rem | Section headings |
| `text-xl` | 2rem | Page headings |
| `text-2xl` | 3rem | Hero subheading |
| `text-3xl` | 3.75rem | Hero heading |

Font families: `font-sans` (FigTree), `font-mono` (Geist Mono)

### Animation Standards

- Use `useMotion()` hook from `MotionContext` — respects `prefers-reduced-motion`
- Standard easing: `[0.22, 1, 0.36, 1]` (CSS: `var(--easing-smooth)`)
- Durations: fast=150ms, normal=250ms, slow=350ms
- List stagger: 60ms between items
- Entry animations: 0.4–0.6s duration

### Component Variants

Components use variant maps (not CVA for most):

```typescript
const variantStyles = {
  primary: 'bg-brand-yellow-main text-brand-black',
  ghost: 'bg-transparent text-brand-white border border-brand-gray-medium',
  accent: 'bg-brand-orange text-brand-white',
};
```

Button variants: `primary`, `ghost`, `accent`, `outline`, `dark`, `black`
Button sizes: `xs`, `sm`, `md`, `lg`
Tag tones: `accent`, `success`, `warning`, `neutral`

### Utility Classes (from globals.css)

- `.glass` / `.glass-strong` — glassmorphism with backdrop blur
- `.interactive-lift` — hover lift effect
- `.glow-accent` — yellow glow box-shadow
- `.card` — standard card with surface background and shadow
- `.section-container` — responsive max-width container
- `.shaped-section` — angled clip-path section dividers

### Accessibility

- Semantic HTML (`<button>`, `<nav>`, `<time>`, not `<div onClick>`)
- ARIA attributes where needed (`aria-label`, `aria-current`)
- Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- Focus: `focus-visible` with 2px brand-primary outline
- Screen reader support: `sr-only` class
- All animations disabled via `prefers-reduced-motion: reduce`

## Testing

### Running Tests

```bash
npm run test:run      # Run all tests once
npm run test          # Run in watch mode
npm run test:coverage # Run with coverage report
npm run test:related  # Run tests related to changed files
```

### Test Structure

Tests live in `__tests__/` directories next to source files:
```
src/lib/roles/
├── constants.ts
├── guards.ts
└── __tests__/
    ├── constants.test.ts
    └── guards.test.ts
```

### What Must Be Tested

**Always test** (P0):
- Role guards and permission logic
- Payment-related logic (pricing, validation, webhook handlers)
- Discount/coupon logic
- Rate limiting

**Should test** (P1):
- Zod validation schemas
- Business logic functions (scoring, decisions, ticket creation)
- Utility functions with non-trivial logic

**Nice to have** (P2):
- API route handlers (with mocked dependencies)
- Component rendering (accessibility checks)

### Test Conventions

- Use `describe`/`it` blocks with descriptive names
- Mock external dependencies (`vi.mock`, `vi.spyOn`)
- Use `vi.useFakeTimers()` for time-dependent tests
- Use `vi.stubEnv()` for environment variable tests
- Create factory functions (e.g., `makeProfile()`) for test data
- Clean up in `afterEach` — restore mocks, timers, env vars

## CI Pipeline

CI runs on GitHub Actions for every push to `main` and every PR targeting `main`.

### Jobs (run in parallel)

| Job | Command | Purpose |
|-----|---------|---------|
| lint | `npm run lint` | ESLint checks |
| typecheck | `npm run typecheck` | TypeScript strict mode |
| test | `npm run test:run` | Vitest test suite |
| build | `npm run build` | Next.js production build |
| supabase-migrations | Supabase CLI checks | Migration ordering and validity |

### Running CI Checks Locally

```bash
npm run lint          # Same as CI lint job
npm run typecheck     # Same as CI typecheck job
npm run test:run      # Same as CI test job
npm run build         # Same as CI build job
```

## Key Domain Concepts

### User Roles

| Role | Permissions |
|------|------------|
| `attendee` | View own tickets, manage own profile |
| `speaker` | Above + submit talks, manage own workshops |
| `admin` | Full access to all resources |

Role hierarchy: `attendee` (1) < `speaker` (2) < `admin` (3)

### CFP Submission Flow

`draft` → `submitted` → `under_review` → `accepted` / `rejected` / `waitlisted`

### Ticket Model

- **Category**: `standard`, `student`, `unemployed`, `vip`
- **Stage**: `blind_bird`, `early_bird`, `general_admission`, `late_bird`
- **Payment Status**: `pending`, `confirmed`, `cancelled`, `refunded`

## Key Don'ts

- Don't use `any` types
- Don't hardcode colors — use CSS variables via Tailwind classes
- Don't put content data in components — use `src/data/`
- Don't use `<div>` for interactive elements — use `<button>`, `<a>`, etc.
- Don't skip barrel exports in component directories
- Don't create documentation summary files after changes
- Don't use inline SVGs — use `lucide-react`
- Don't bypass the response helpers in new API routes

## Documentation

- `docs/` — Analytics, logging, CFP, component integration guides
- `docs/audit/` — Risk audit, testing opportunities, consolidation plan
- `docs/ci.md` — CI pipeline documentation
- `.cursorrules` — Detailed coding standards
- `README.md` — Project overview and setup
