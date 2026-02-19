# Tech Stack Detection

Detects visitor's frontend tech stack based on their installed **browser DevTools extensions** and sends low-cardinality traits to PostHog for persona building.

## How It Works

Browser DevTools extensions (React DevTools, Vue DevTools, Redux DevTools, etc.) inject global hooks into **every page** the user visits. By checking for these hooks, we can infer what frameworks and tools the visitor works with - regardless of what the website itself is built with.

## What We Detect

| Category | Extension | Global Hook |
|----------|-----------|-------------|
| **Framework** | React DevTools | `__REACT_DEVTOOLS_GLOBAL_HOOK__` |
| **Framework** | Vue DevTools | `__VUE_DEVTOOLS_GLOBAL_HOOK__` |
| **Framework** | Angular DevTools | `__ANGULAR_DEVTOOLS_GLOBAL_HOOK__` |
| **Framework** | Svelte DevTools | `__SVELTE_DEVTOOLS_GLOBAL_HOOK__` |
| **Framework** | Solid DevTools | `__SOLID_DEVTOOLS_GLOBAL_HOOK__` |
| **State** | Redux DevTools | `__REDUX_DEVTOOLS_EXTENSION__` |
| **State** | MobX DevTools | `__MOBX_DEVTOOLS_GLOBAL_HOOK__` |
| **Data** | Apollo DevTools | `__APOLLO_DEVTOOLS_GLOBAL_HOOK__` |
| **Data** | URQL DevTools | `__URQL_DEVTOOLS__` |
| **Data** | React Query DevTools | `__REACT_QUERY_DEVTOOLS__` |

## What We DON'T Detect

We intentionally do NOT detect the website's own tech stack (script paths, DOM markers, framework globals like `__NEXT_DATA__`). Those would always show React + Next.js since that's what this site is built with.

## PostHog Properties

### Event: `tech_stack_detected`

| Property | Type | Example |
|----------|------|---------|
| `framework_primary` | string | `"react"` |
| `state_management` | string[] | `["redux"]` |
| `data_layer` | string[] | `["apollo"]` |
| `confidence` | string | `"high"` |
| `detector_version` | string | `"1.1.0"` |

### Confidence Levels

- **none**: No extensions detected (visitor may not be a developer)
- **low**: 1 extension detected
- **high**: 2+ extensions detected

## Adding New Signals

Edit `src/lib/analytics/techStackDetector/signals.ts`:

```typescript
{
  id: 'my-devtools',
  category: 'framework',
  label: 'myframework',
  weight: 5,
  prodSafe: true,
  check: (ctx) => hasGlobal(ctx, '__MY_DEVTOOLS_GLOBAL_HOOK__'),
}
```

Only add signals based on browser extension hooks - never site-specific markers.

## Testing

```bash
npm run test:run -- src/lib/analytics/techStackDetector
```
