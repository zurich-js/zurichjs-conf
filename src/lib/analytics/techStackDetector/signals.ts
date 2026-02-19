/**
 * Tech Stack Detection Signals Registry
 *
 * IMPORTANT: These signals detect the VISITOR's tech stack based on their
 * installed browser extensions, NOT the website's tech stack.
 *
 * Browser DevTools extensions inject globals into every page the user visits,
 * which tells us what frameworks/tools the visitor works with.
 *
 * @module techStackDetector/signals
 */

import type { Signal, DetectionContext } from './types';

/**
 * Helper to safely check for a window global.
 * Returns false on any error.
 */
function hasGlobal(ctx: DetectionContext, key: string): boolean {
  try {
    return ctx.window?.[key] !== undefined;
  } catch {
    return false;
  }
}

/**
 * Detection signals based on browser extensions.
 *
 * These detect what the VISITOR uses, not what the site is built with.
 * Only browser extension hooks are reliable for this purpose.
 */
export const SIGNALS: Signal[] = [
  // ============================================================================
  // FRAMEWORK SIGNALS - Based on DevTools extensions
  // ============================================================================

  // React DevTools extension injects this hook into every page
  {
    id: 'react-devtools',
    category: 'framework',
    label: 'react',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__REACT_DEVTOOLS_GLOBAL_HOOK__'),
  },

  // Vue DevTools extension injects this hook into every page
  {
    id: 'vue-devtools',
    category: 'framework',
    label: 'vue',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__VUE_DEVTOOLS_GLOBAL_HOOK__'),
  },

  // Angular Augury/DevTools - less common but exists
  {
    id: 'angular-devtools',
    category: 'framework',
    label: 'angular',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__ANGULAR_DEVTOOLS_GLOBAL_HOOK__'),
  },

  // Svelte DevTools extension
  {
    id: 'svelte-devtools',
    category: 'framework',
    label: 'svelte',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__SVELTE_DEVTOOLS_GLOBAL_HOOK__'),
  },

  // Solid DevTools extension
  {
    id: 'solid-devtools',
    category: 'framework',
    label: 'solid',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__SOLID_DEVTOOLS_GLOBAL_HOOK__'),
  },

  // ============================================================================
  // STATE MANAGEMENT SIGNALS - Based on DevTools extensions
  // ============================================================================

  // Redux DevTools extension - very popular
  {
    id: 'redux-devtools',
    category: 'state',
    label: 'redux',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__REDUX_DEVTOOLS_EXTENSION__'),
  },

  // MobX DevTools extension
  {
    id: 'mobx-devtools',
    category: 'state',
    label: 'mobx',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__MOBX_DEVTOOLS_GLOBAL_HOOK__'),
  },

  // ============================================================================
  // DATA LAYER SIGNALS - Based on DevTools extensions
  // ============================================================================

  // Apollo DevTools extension
  {
    id: 'apollo-devtools',
    category: 'data',
    label: 'apollo',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__APOLLO_DEVTOOLS_GLOBAL_HOOK__'),
  },

  // URQL DevTools extension
  {
    id: 'urql-devtools',
    category: 'data',
    label: 'urql',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__URQL_DEVTOOLS__'),
  },

  // React Query DevTools - note: this is trickier as it's usually bundled
  // but the standalone extension also exists
  {
    id: 'tanstack-query-devtools',
    category: 'data',
    label: 'tanstack_query',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__REACT_QUERY_DEVTOOLS__'),
  },
];

/**
 * Get all signals that are safe to run in the given environment.
 *
 * @param isProduction - Whether we're in production mode
 * @returns Array of signals safe to run
 */
export function getSafeSignals(isProduction: boolean): Signal[] {
  if (!isProduction) {
    return SIGNALS;
  }
  return SIGNALS.filter((s) => s.prodSafe);
}
