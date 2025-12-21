# Claude Code Project Guide

This is a ZurichJS Conference 2026 platform built with Next.js, Supabase, and Stripe.

## Quick Reference

### Tech Stack
- **Framework**: Next.js 15 (Pages Router)
- **Database/Auth**: Supabase
- **Payments**: Stripe
- **Styling**: Tailwind CSS v4
- **State**: TanStack Query + Context API
- **Types**: TypeScript (strict)
- **Icons**: lucide-react

### Key Directories
```
src/
├── pages/           # Next.js pages and API routes
│   ├── api/         # Backend endpoints
│   ├── cfp/         # Call for Papers system
│   ├── admin/       # Admin dashboards
│   └── account/     # User account pages
├── components/      # React components (Atomic Design)
│   ├── atoms/       # Base components (Button, Heading, etc.)
│   ├── molecules/   # Composite components
│   ├── organisms/   # Complex page sections
│   ├── cfp/         # CFP-specific components
│   └── admin/       # Admin-specific components
├── lib/             # Domain logic
│   ├── analytics/   # PostHog tracking
│   ├── cfp/         # CFP business logic
│   ├── supabase/    # Database client
│   ├── stripe/      # Payment integration
│   └── types/       # TypeScript types
└── hooks/           # Custom React hooks
```

## Coding Patterns

### Component Structure
- Files should be under 500 lines of code
- Use barrel exports (`index.ts`) for clean imports
- Extract complex sections into separate component files
- Use lucide-react for icons (not inline SVGs)

### Example Component Pattern
```typescript
import { ChevronLeft, Check } from 'lucide-react';
import { Button, Heading } from '@/components/atoms';

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

### API Routes
- Use Zod for request validation
- Wrap handlers in try/catch with proper error responses
- Use structured logging with `logger.scope()`
- Track analytics for important events

### State Management
- TanStack Query for server state (`useCfp*` hooks)
- React Context for UI state (modals, filters)
- URL state for shareable filters/pagination

## CFP System

### User Roles
- **Speaker**: Submits talks, manages profile
- **Reviewer**: Reviews submissions, leaves feedback
- **Admin/Super Admin**: Full system access, can change statuses

### Submission Statuses
- `draft` → `submitted` → `under_review` → `accepted`/`rejected`/`waitlisted`

### Key CFP Components
```
src/components/cfp/
├── submit/          # Wizard steps (TypeStep, DetailsStep, etc.)
├── reviewer/        # Dashboard components (FilterBar, StatsCards, etc.)
└── ReviewGuide.tsx  # Review guidelines modal
```

### Key CFP Hooks
- `useCfpSubmissions()` - Fetch speaker submissions
- `useCfpReviewerDashboard()` - Reviewer dashboard data
- `useSubmitReview()` - Submit review mutation

## Admin System

### Admin Components
```
src/components/admin/
├── speakers/        # Speaker management (SpeakerCard, modals)
└── cfp/             # CFP admin components (StatusActions, etc.)
```

## Important Files

### Types
- `src/lib/types/cfp.ts` - CFP domain types
- `src/lib/types/ticket-constants.ts` - Ticket types

### API Routes
- `src/pages/api/cfp/` - Speaker CFP endpoints
- `src/pages/api/admin/cfp/` - Admin CFP endpoints
- `src/pages/api/webhooks/stripe.ts` - Stripe webhook handler

### Hooks
- `src/hooks/useCfp.ts` - All CFP-related hooks
- `src/hooks/useCart.ts` - Cart management

## Testing
```bash
npm run test:run      # Run tests
npm run typecheck     # TypeScript check
npm run lint          # ESLint
npm run build         # Full build
```

## Common Tasks

### Adding a New Component
1. Create component file in appropriate directory
2. Add to `index.ts` barrel export
3. Import using barrel export path

### Refactoring Large Files
1. Identify logical sections (modals, cards, forms)
2. Create `types.ts` for shared interfaces
3. Extract components with clear props
4. Keep main file as orchestrator
5. Use barrel exports for clean imports

### Adding API Validation
```typescript
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

const parsed = schema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({ error: 'Invalid input' });
}
```

## Documentation
- See `docs/` for analytics and logging guides
- See `.cursorrules` for detailed coding standards
- See `README.md` for project overview
