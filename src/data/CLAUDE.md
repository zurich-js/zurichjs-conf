# Data — `src/data/`

All static content lives here. **Never in components.**

## Why

- Content changes don't require touching component code.
- Translators / content editors have one place to look.
- Components stay focused on rendering, not on data definition.
- TypeScript types in components are derived from the data shape, not duplicated.

## Files

| File | Contains |
|---|---|
| `hero.ts` | Landing hero copy + CTAs |
| `schedule.ts` | Conference schedule (sessions, times, rooms) |
| `tickets.tsx` | Ticket plans (TSX because some entries include JSX) |
| `timeline.ts` | Key dates (CFP open, CFP close, conference) — drives `closure.ts` |
| `sponsors.ts` | Sponsor list |
| `sponsorship.ts` | Sponsorship tier copy |
| `partner-assets.ts` | Partner assets |
| `about-us.ts` | About copy |
| `landing-learn.ts` | "Learn more" copy |
| `info-pages.ts` | Free-form info pages (largest — 1078 lines) |
| `public-program.ts` | Public-facing program data |
| `index.ts` | Barrel re-exports |

## Conventions

```typescript
import type { TimelineSectionProps } from '@/components/organisms/TimelineSection';

export const timelineData: TimelineSectionProps = {
  title: 'Conference Timeline',
  entries: [
    { id: 'cfp-opens', label: 'CFP opens', dateISO: '2026-01-15' },
    { id: 'cfp-ends', label: 'CFP closes', dateISO: '2026-04-03' },
    // ...
  ],
} as const;
```

- **Typed exports** — the constant is typed against the component's prop interface.
- **`as const`** — literal types, narrow inference, no accidental widening.
- **`dateISO`** as a string — never `new Date(...)` here (would hit hydration
  issues if accidentally executed at render time).

## Don't

- Don't fetch from this directory at runtime — it's all compile-time constants.
- Don't put user-specific data here — it's static content for everyone.
- Don't import from `@/lib/supabase/*` — data files are pure.
- Don't fan out a single concept into one file per entry — keep related content
  together.

## The timeline is the source of truth for CFP closure

`src/lib/cfp/closure.ts` reads `timelineData.entries.find(e => e.id === 'cfp-ends').dateISO`.
Changing the CFP close date means updating `timeline.ts`. Don't hardcode the date
in code elsewhere.
