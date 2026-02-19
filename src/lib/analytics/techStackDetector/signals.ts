/**
 * Tech Stack Detection Signals Registry
 *
 * Data-driven signal definitions for detecting frontend tech stacks.
 * Each signal defines a check that can indicate a particular technology.
 *
 * SAFETY GUIDELINES:
 * - All checks must be synchronous and cheap
 * - Never access cookies, localStorage (beyond our dedupe), or user data
 * - Never make network calls or load external scripts
 * - Never read page content or form data
 * - Only check public globals, DOM attributes, and script paths
 *
 * @module techStackDetector/signals
 */

import type { Signal, DetectionContext } from './types';

/**
 * Helper to safely check if a script src contains a substring.
 * Returns false on any error.
 */
function hasScriptSrc(ctx: DetectionContext, pattern: string | RegExp): boolean {
  try {
    if (typeof pattern === 'string') {
      return ctx.scriptSrcs.some((src) => src.includes(pattern));
    }
    return ctx.scriptSrcs.some((src) => pattern.test(src));
  } catch {
    return false;
  }
}

/**
 * Helper to safely check for a DOM element/attribute.
 * Returns false on any error.
 */
function hasElement(ctx: DetectionContext, selector: string): boolean {
  try {
    return !!ctx.document?.querySelector(selector);
  } catch {
    return false;
  }
}

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
 * All detection signals.
 * Organized by category for readability.
 *
 * Signal weight guide:
 * - 1: Very weak (common in many contexts)
 * - 2: Weak (might be coincidental)
 * - 3: Moderate (good indicator)
 * - 4: Strong (very reliable)
 * - 5: Definitive (unique to the tech)
 */
export const SIGNALS: Signal[] = [
  // ============================================================================
  // FRAMEWORK SIGNALS - Primary frontend framework
  // ============================================================================

  // React signals
  {
    id: 'react-devtools-hook',
    category: 'framework',
    label: 'react',
    weight: 4,
    prodSafe: true, // DevTools hook exists even in prod if user has extension
    check: (ctx) => hasGlobal(ctx, '__REACT_DEVTOOLS_GLOBAL_HOOK__'),
  },
  {
    id: 'react-root-container',
    category: 'framework',
    label: 'react',
    weight: 3,
    prodSafe: true,
    check: (ctx) => hasElement(ctx, '[data-reactroot], #__next, #root'),
  },
  {
    id: 'react-fiber',
    category: 'framework',
    label: 'react',
    weight: 5,
    prodSafe: true,
    check: (ctx) => {
      try {
        const root = ctx.document?.getElementById('__next') || ctx.document?.getElementById('root');
        if (!root) return false;
        // React Fiber attaches _reactRootContainer to root elements
        return '_reactRootContainer' in root || Object.keys(root).some(k => k.startsWith('__reactFiber'));
      } catch {
        return false;
      }
    },
  },

  // Vue signals
  {
    id: 'vue-global',
    category: 'framework',
    label: 'vue',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__VUE__'),
  },
  {
    id: 'vue-devtools-hook',
    category: 'framework',
    label: 'vue',
    weight: 4,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__VUE_DEVTOOLS_GLOBAL_HOOK__'),
  },
  {
    id: 'vue-app-attribute',
    category: 'framework',
    label: 'vue',
    weight: 3,
    prodSafe: true,
    check: (ctx) => hasElement(ctx, '[data-v-app], [data-v-]'),
  },

  // Angular signals
  {
    id: 'angular-ng-version',
    category: 'framework',
    label: 'angular',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasElement(ctx, '[ng-version]'),
  },
  {
    id: 'angular-zone',
    category: 'framework',
    label: 'angular',
    weight: 4,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, 'Zone'),
  },
  {
    id: 'angular-ng-global',
    category: 'framework',
    label: 'angular',
    weight: 3,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, 'ng'),
  },

  // Svelte signals
  {
    id: 'svelte-hmr',
    category: 'framework',
    label: 'svelte',
    weight: 4,
    prodSafe: false, // HMR is dev-only
    check: (ctx) => hasGlobal(ctx, '__SVELTE_HMR_CALLBACK__'),
  },
  {
    id: 'svelte-component',
    category: 'framework',
    label: 'svelte',
    weight: 3,
    prodSafe: true,
    check: (ctx) => hasElement(ctx, '[class*="svelte-"]'),
  },

  // Solid signals
  {
    id: 'solid-dev',
    category: 'framework',
    label: 'solid',
    weight: 4,
    prodSafe: false,
    check: (ctx) => hasGlobal(ctx, '_$HY'),
  },
  {
    id: 'solid-script',
    category: 'framework',
    label: 'solid',
    weight: 3,
    prodSafe: true,
    check: (ctx) => hasScriptSrc(ctx, /solid-js|solidjs/i),
  },

  // ============================================================================
  // META-FRAMEWORK SIGNALS
  // ============================================================================

  // Next.js signals
  {
    id: 'nextjs-data',
    category: 'meta',
    label: 'nextjs',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__NEXT_DATA__'),
  },
  {
    id: 'nextjs-script-path',
    category: 'meta',
    label: 'nextjs',
    weight: 4,
    prodSafe: true,
    check: (ctx) => hasScriptSrc(ctx, '/_next/'),
  },
  {
    id: 'nextjs-element',
    category: 'meta',
    label: 'nextjs',
    weight: 3,
    prodSafe: true,
    check: (ctx) => hasElement(ctx, '#__next'),
  },

  // Nuxt signals
  {
    id: 'nuxt-global',
    category: 'meta',
    label: 'nuxt',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__NUXT__'),
  },
  {
    id: 'nuxt-script-path',
    category: 'meta',
    label: 'nuxt',
    weight: 4,
    prodSafe: true,
    check: (ctx) => hasScriptSrc(ctx, '/_nuxt/'),
  },

  // SvelteKit signals
  {
    id: 'sveltekit-data-attribute',
    category: 'meta',
    label: 'sveltekit',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasElement(ctx, '[data-sveltekit-hydrate], [data-sveltekit-preload-data]'),
  },
  {
    id: 'sveltekit-script-path',
    category: 'meta',
    label: 'sveltekit',
    weight: 4,
    prodSafe: true,
    check: (ctx) => hasScriptSrc(ctx, '/_app/'),
  },

  // Gatsby signals
  {
    id: 'gatsby-root',
    category: 'meta',
    label: 'gatsby',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasElement(ctx, '#___gatsby'),
  },
  {
    id: 'gatsby-global',
    category: 'meta',
    label: 'gatsby',
    weight: 4,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '___gatsby'),
  },

  // Remix signals
  {
    id: 'remix-global',
    category: 'meta',
    label: 'remix',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__remixContext'),
  },
  {
    id: 'remix-build',
    category: 'meta',
    label: 'remix',
    weight: 4,
    prodSafe: true,
    check: (ctx) => hasScriptSrc(ctx, '/build/'),
  },

  // Astro signals
  {
    id: 'astro-island',
    category: 'meta',
    label: 'astro',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasElement(ctx, 'astro-island, [data-astro-cid]'),
  },

  // Storybook signals
  {
    id: 'storybook-global',
    category: 'meta',
    label: 'storybook',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, 'Storybook'),
  },
  {
    id: 'storybook-root',
    category: 'meta',
    label: 'storybook',
    weight: 4,
    prodSafe: true,
    check: (ctx) => hasElement(ctx, '#storybook-root'),
  },

  // ============================================================================
  // TOOLING SIGNALS - Build tools
  // ============================================================================

  // Vite signals
  {
    id: 'vite-client',
    category: 'tooling',
    label: 'vite',
    weight: 5,
    prodSafe: false, // Vite client is dev-only
    check: (ctx) => hasScriptSrc(ctx, '/@vite/client'),
  },
  {
    id: 'vite-hmr',
    category: 'tooling',
    label: 'vite',
    weight: 4,
    prodSafe: false,
    check: (ctx) => hasGlobal(ctx, '__vite_plugin_react_preamble_installed__'),
  },

  // Webpack signals
  {
    id: 'webpack-jsonp',
    category: 'tooling',
    label: 'webpack',
    weight: 4,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, 'webpackJsonp') || hasGlobal(ctx, 'webpackChunk'),
  },
  {
    id: 'webpack-hot',
    category: 'tooling',
    label: 'webpack',
    weight: 3,
    prodSafe: false,
    check: (ctx) => {
      try {
        // @ts-expect-error - checking module.hot which exists in webpack HMR
        return ctx.window?.module?.hot !== undefined;
      } catch {
        return false;
      }
    },
  },

  // ============================================================================
  // STATE MANAGEMENT SIGNALS
  // ============================================================================

  // Redux signals
  {
    id: 'redux-devtools',
    category: 'state',
    label: 'redux',
    weight: 5,
    prodSafe: true, // Extension hook exists if user has extension
    check: (ctx) => hasGlobal(ctx, '__REDUX_DEVTOOLS_EXTENSION__'),
  },
  {
    id: 'redux-store',
    category: 'state',
    label: 'redux',
    weight: 4,
    prodSafe: true,
    check: (ctx) => {
      try {
        // Redux stores often exposed on window for debugging
        const win = ctx.window;
        if (!win) return false;
        return Object.keys(win).some(k =>
          k.toLowerCase().includes('store') &&
          typeof win[k] === 'object' &&
          win[k] !== null &&
          'getState' in (win[k] as object) &&
          'dispatch' in (win[k] as object)
        );
      } catch {
        return false;
      }
    },
  },

  // MobX signals
  {
    id: 'mobx-devtools',
    category: 'state',
    label: 'mobx',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__MOBX_DEVTOOLS_GLOBAL_HOOK__'),
  },

  // Zustand signals (harder to detect reliably)
  {
    id: 'zustand-devtools',
    category: 'state',
    label: 'zustand',
    weight: 3,
    prodSafe: true,
    check: (ctx) => {
      // Zustand often uses Redux DevTools extension
      try {
        const extension = ctx.window?.__REDUX_DEVTOOLS_EXTENSION__;
        if (!extension) return false;
        // Check if there's a zustand store name in connection
        return hasScriptSrc(ctx, /zustand/i);
      } catch {
        return false;
      }
    },
  },

  // Pinia signals (Vue)
  {
    id: 'pinia-devtools',
    category: 'state',
    label: 'pinia',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__PINIA_DEVTOOLS_TOAST__'),
  },

  // Vuex signals (Vue)
  {
    id: 'vuex-store',
    category: 'state',
    label: 'vuex',
    weight: 4,
    prodSafe: true,
    check: (ctx) => {
      try {
        const nuxt = ctx.window?.__NUXT__;
        if (nuxt && typeof nuxt === 'object' && 'state' in (nuxt as object)) {
          return true;
        }
        return hasGlobal(ctx, '__vuex__');
      } catch {
        return false;
      }
    },
  },

  // NgRx signals (Angular)
  {
    id: 'ngrx-devtools',
    category: 'state',
    label: 'ngrx',
    weight: 4,
    prodSafe: true,
    check: (ctx) => {
      // NgRx also uses Redux DevTools
      try {
        if (!hasGlobal(ctx, '__REDUX_DEVTOOLS_EXTENSION__')) return false;
        // Check for Angular presence as well
        return hasElement(ctx, '[ng-version]');
      } catch {
        return false;
      }
    },
  },

  // ============================================================================
  // DATA LAYER SIGNALS
  // ============================================================================

  // TanStack Query (React Query) signals
  {
    id: 'tanstack-query-devtools',
    category: 'data',
    label: 'tanstack_query',
    weight: 5,
    prodSafe: true, // DevTools can be present in prod
    check: (ctx) => hasElement(ctx, '[class*="ReactQueryDevtools"], [class*="TanstackQueryDevtools"]'),
  },
  {
    id: 'tanstack-query-script',
    category: 'data',
    label: 'tanstack_query',
    weight: 3,
    prodSafe: true,
    check: (ctx) => hasScriptSrc(ctx, /tanstack.*query|react-query/i),
  },

  // Apollo Client signals
  {
    id: 'apollo-client',
    category: 'data',
    label: 'apollo',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__APOLLO_CLIENT__'),
  },
  {
    id: 'apollo-devtools',
    category: 'data',
    label: 'apollo',
    weight: 4,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__APOLLO_DEVTOOLS_GLOBAL_HOOK__'),
  },

  // URQL signals
  {
    id: 'urql-devtools',
    category: 'data',
    label: 'urql',
    weight: 5,
    prodSafe: true,
    check: (ctx) => hasGlobal(ctx, '__URQL_DEVTOOLS__'),
  },

  // SWR signals
  {
    id: 'swr-cache',
    category: 'data',
    label: 'swr',
    weight: 3,
    prodSafe: true,
    check: (ctx) => hasScriptSrc(ctx, /\/swr\//i),
  },
];

/**
 * Get all signals that are safe to run in the given environment.
 *
 * @param isProduction - Whether we're in production mode
 * @returns Array of signals safe to run
 *
 * @example
 * const signals = getSafeSignals(true);
 * // Returns only prodSafe signals in production
 */
export function getSafeSignals(isProduction: boolean): Signal[] {
  if (!isProduction) {
    return SIGNALS;
  }
  return SIGNALS.filter((s) => s.prodSafe);
}
