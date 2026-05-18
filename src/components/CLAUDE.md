# Components — `src/components/`

Atomic Design. 350+ components organized atoms → molecules → organisms, with
domain-specific subdirectories (`cfp/`, `admin/`, `cart/`, `workshops/`, etc.).

## Atomic Design contract

| Layer | What | Allowed |
|---|---|---|
| **atoms/** | Primitives — Button, Heading, Input, Icon | Pure UI. No business logic, no data fetching, no Supabase imports. |
| **molecules/** | Compositions — Card, FormField, Modal, Timeline | Combinations of atoms. May manage internal state (open/closed, focus). |
| **organisms/** | Page sections — Hero, Schedule, Navigation | Receive data via props. **Never fetch internally.** |

Pages compose organisms. Hooks fetch data and pass it down.

## Barrel exports

Every component directory MUST have `index.ts`:

```typescript
export { Button } from './Button';
export type { ButtonProps } from './Button';
```

Both the component and the prop type. Without the type export, consumers can't
extend props cleanly.

## File size

- New files: under 500 lines, hard rule.
- Existing files > 700 lines: refactor when you touch them. Several modals (e.g.
  `WorkshopAdminModal.tsx` at 903) currently violate this — split when next changed.
- Extract sub-components into the same directory; keep the export surface narrow.

## Icons

Use `lucide-react`. Never inline SVG paths in component files.

```typescript
import { Check } from 'lucide-react';
<Check className="w-4 h-4" aria-hidden="true" />
```

## Motion

Wrap framer-motion in the `useMotion()` hook so `prefers-reduced-motion` is respected:

```typescript
import { useMotion } from '@/contexts/MotionContext';

const { shouldAnimate } = useMotion();

if (!shouldAnimate) return <div>{content}</div>;

return (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
  >
    {content}
  </motion.div>
);
```

Standard easing: `[0.22, 1, 0.36, 1]`. Standard duration: 0.4-0.6s. Stagger: 60ms.

## Accessibility — non-negotiable

- Semantic HTML: `<button>`, `<nav>`, `<time>`, `<dialog>` where they fit. Never
  `<div onClick>`.
- ARIA labels on icon-only buttons; `sr-only` span for screen readers.
- Visible focus rings — don't `outline-none` without a replacement.
- Keyboard: Tab, Enter, Escape, Arrow keys where appropriate.
- `aria-hidden="true"` on decorative icons.

## Hydration safety

The #1 source of hydration warnings here:

```typescript
// BAD — different on server vs client
const expiry = new Date(Date.now() + 86400000).toISOString();

// GOOD — static, deterministic
const EXPIRY_ISO = '2026-09-11T00:00:00.000Z';

// GOOD — client-only with placeholder
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <Placeholder />;
return <DynamicContent />;
```

Never call `new Date()`, `Math.random()`, or browser APIs during render. Defer to `useEffect`.

## Tailwind v4 + `@theme` tokens

Colors and spacing come from `@theme` blocks in `src/styles/globals.css`. Don't
hardcode hex colors.

```tsx
// BAD
<div className="bg-[#242528]" />

// GOOD
<div className="bg-surface-card" />
```

## Props convention

```typescript
interface MyComponentProps {
  // Required first
  title: string;
  id: string;

  // Optional next
  description?: string;
  className?: string;

  // Callbacks + children last
  onClick?: () => void;
  children?: React.ReactNode;
}
```

Destructure with defaults; export both the component and the props type.

## Domain subdirectories

- `cfp/` — CFP-specific (submit wizard, reviewer dashboard, profile). See `src/components/cfp/CLAUDE.md`.
- `admin/` — Admin dashboard. See `src/components/admin/CLAUDE.md`.
- `cart/`, `workshops/`, `manage-order/`, `scheduling/`, `trip-cost/`, `blog/` — domain UI.
- `ui/` — Partial shadcn adoption (1 file). Prefer existing atoms over adding more shadcn primitives.

## When to put it where

```
Is it a styled primitive (button, heading, input)?     → atoms/
Does it combine 2-4 atoms into a focused unit?          → molecules/
Is it a full page section that takes domain data?       → organisms/
Is it specific to one domain (CFP, admin, cart)?        → that domain's folder
```
