# Tech Stack Detection

A privacy-first, performance-conscious module for detecting visitor's frontend tech stack and sending low-cardinality traits to PostHog for persona building.

## Quick Start

Detection is initialized automatically in `_app.tsx` after PostHog loads. To control via feature flag:

```bash
NEXT_PUBLIC_FF_TECH_STACK_DETECTION=true
```

## What We Detect

| Category | Technologies |
|----------|-------------|
| Frameworks | React, Vue, Angular, Svelte, Solid |
| Meta-frameworks | Next.js, Nuxt, SvelteKit, Gatsby, Remix, Astro |
| State management | Redux, MobX, Zustand, Pinia, Vuex, NgRx |
| Data layer | TanStack Query, Apollo, URQL, SWR |
| Tooling | Vite, Webpack |

## Privacy & Performance

- **Privacy**: Only detects coarse tech traits via public signals (globals, DOM attributes, script paths). No fingerprinting, no content scraping.
- **Performance**: Runs once per session after `requestIdleCallback`. All checks are synchronous and cheap.
- **Deduplication**: Uses sessionStorage (`zjs:techStack:v1`) to prevent duplicate events.

## PostHog Event

Event: `tech_stack_detected`

| Property | Type | Description |
|----------|------|-------------|
| `framework_primary` | string | Main framework detected |
| `framework_meta` | string[] | Meta-frameworks detected |
| `state_management` | string[] | State tools detected |
| `data_layer` | string[] | Data fetching tools detected |
| `tooling` | string[] | Build tools detected |
| `confidence` | string | low, medium, or high |
| `detector_version` | string | Version for tracking changes |

## Adding New Signals

Edit `src/lib/analytics/techStackDetector/signals.ts`:

```typescript
{
  id: 'my-signal',
  category: 'framework',
  label: 'myframework',
  weight: 4,  // 1-5
  prodSafe: true,
  check: (ctx) => hasGlobal(ctx, '__MY_FRAMEWORK__'),
}
```

## Testing

```bash
npm run test:run -- src/lib/analytics/techStackDetector
```
