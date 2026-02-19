/**
 * Unit Tests for Tech Stack Detector
 *
 * Tests for:
 * - Signal detection
 * - Scoring and trait resolution
 * - Session deduplication
 * - Various tech stack scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock PostHog before imports
vi.mock('posthog-js', () => ({
  default: {
    capture: vi.fn(),
    people: { set: vi.fn() },
    get_distinct_id: vi.fn(() => 'test-user-123'),
  },
}));

// Import after mocks
import { SIGNALS, getSafeSignals } from '../signals';
import {
  buildContext,
  runSignals,
  aggregateScores,
  calculateConfidence,
  resolveTraits,
} from '../scoring';
import {
  generateTraitsHash,
  shouldSkipDetection,
  markDetectionComplete,
  resetDetectionState,
} from '../dedupe';
import { sendTechTraitsToPosthog } from '../posthog';
import type { DetectionContext, TechStackTraits, MatchedSignal } from '../types';
import { DETECTOR_VERSION } from '../types';
import posthog from 'posthog-js';

// ============================================================================
// Helper functions for testing
// ============================================================================

/**
 * Creates a mock detection context with specified globals and DOM elements.
 */
function createMockContext(options: {
  globals?: Record<string, unknown>;
  scriptSrcs?: string[];
  elements?: string[];
  isProduction?: boolean;
}): DetectionContext {
  const { globals = {}, scriptSrcs = [], elements = [], isProduction = false } = options;

  // Create mock window with globals
  const mockWindow: DetectionContext['window'] = {
    ...globals,
  } as DetectionContext['window'];

  // Create mock document with querySelector
  const mockDocument = {
    querySelector: vi.fn((selector: string) => {
      // Check if any element matches the selector
      return elements.some((el) => {
        // Simple matching: check if selector matches element tag or attribute
        if (selector.includes(',')) {
          return selector.split(',').some((s) => el.includes(s.trim().replace(/[\[\]"'=*^$]/g, '')));
        }
        return el.includes(selector.replace(/[\[\]"'=*^$]/g, ''));
      })
        ? {}
        : null;
    }),
    getElementsByTagName: vi.fn(() => []),
  } as unknown as Document;

  return {
    window: mockWindow,
    document: mockDocument,
    scriptSrcs,
    isProduction,
  };
}

// ============================================================================
// Signal Tests
// ============================================================================

describe('Signals', () => {
  describe('getSafeSignals', () => {
    it('should return all signals in development', () => {
      const signals = getSafeSignals(false);
      expect(signals.length).toBe(SIGNALS.length);
    });

    it('should return only prodSafe signals in production', () => {
      const signals = getSafeSignals(true);
      expect(signals.length).toBeLessThanOrEqual(SIGNALS.length);
      expect(signals.every((s) => s.prodSafe)).toBe(true);
    });

    it('should have unique signal IDs', () => {
      const ids = SIGNALS.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid weights (1-5)', () => {
      for (const signal of SIGNALS) {
        expect(signal.weight).toBeGreaterThanOrEqual(1);
        expect(signal.weight).toBeLessThanOrEqual(5);
      }
    });
  });
});

// ============================================================================
// Scoring Tests
// ============================================================================

describe('Scoring', () => {
  describe('buildContext', () => {
    it('should return empty context in SSR', () => {
      // Note: This test runs in Node where window is undefined
      const ctx = buildContext(true);
      expect(ctx.window).toBeUndefined();
      expect(ctx.scriptSrcs).toEqual([]);
    });
  });

  describe('runSignals', () => {
    it('should detect React via devtools hook', () => {
      const ctx = createMockContext({
        globals: { __REACT_DEVTOOLS_GLOBAL_HOOK__: {} },
      });

      const matches = runSignals(ctx);
      expect(matches.some((m) => m.signal.id === 'react-devtools-hook')).toBe(true);
    });

    it('should detect Next.js via __NEXT_DATA__', () => {
      const ctx = createMockContext({
        globals: { __NEXT_DATA__: { page: '/' } },
      });

      const matches = runSignals(ctx);
      expect(matches.some((m) => m.signal.id === 'nextjs-data')).toBe(true);
    });

    it('should detect Vue via __VUE__', () => {
      const ctx = createMockContext({
        globals: { __VUE__: {} },
      });

      const matches = runSignals(ctx);
      expect(matches.some((m) => m.signal.id === 'vue-global')).toBe(true);
    });

    it('should detect Nuxt via __NUXT__', () => {
      const ctx = createMockContext({
        globals: { __NUXT__: {} },
      });

      const matches = runSignals(ctx);
      expect(matches.some((m) => m.signal.id === 'nuxt-global')).toBe(true);
    });

    it('should detect Angular via [ng-version] attribute', () => {
      const ctx = createMockContext({
        elements: ['ng-version'],
      });

      const matches = runSignals(ctx);
      expect(matches.some((m) => m.signal.id === 'angular-ng-version')).toBe(true);
    });

    it('should detect Redux devtools', () => {
      const ctx = createMockContext({
        globals: { __REDUX_DEVTOOLS_EXTENSION__: {} },
      });

      const matches = runSignals(ctx);
      expect(matches.some((m) => m.signal.id === 'redux-devtools')).toBe(true);
    });

    it('should detect Apollo client', () => {
      const ctx = createMockContext({
        globals: { __APOLLO_CLIENT__: {} },
      });

      const matches = runSignals(ctx);
      expect(matches.some((m) => m.signal.id === 'apollo-client')).toBe(true);
    });

    it('should detect Next.js via script path', () => {
      const ctx = createMockContext({
        scriptSrcs: ['https://example.com/_next/static/chunks/main.js'],
      });

      const matches = runSignals(ctx);
      expect(matches.some((m) => m.signal.id === 'nextjs-script-path')).toBe(true);
    });

    it('should return empty array for unknown tech stack', () => {
      const ctx = createMockContext({});
      const matches = runSignals(ctx);
      expect(matches.length).toBe(0);
    });

    it('should never throw on signal errors', () => {
      // Create a context that will cause errors
      const badCtx: DetectionContext = {
        window: null as unknown as DetectionContext['window'],
        document: null as unknown as Document,
        scriptSrcs: [],
        isProduction: false,
      };

      expect(() => runSignals(badCtx)).not.toThrow();
    });
  });

  describe('aggregateScores', () => {
    it('should aggregate scores by category', () => {
      const matches: MatchedSignal[] = [
        { signal: { id: 'react-1', category: 'framework', label: 'react', weight: 3, prodSafe: true, check: () => true }, score: 3 },
        { signal: { id: 'react-2', category: 'framework', label: 'react', weight: 4, prodSafe: true, check: () => true }, score: 4 },
        { signal: { id: 'nextjs-1', category: 'meta', label: 'nextjs', weight: 5, prodSafe: true, check: () => true }, score: 5 },
      ];

      const scores = aggregateScores(matches);

      expect(scores.framework.get('react')).toBe(7);
      expect(scores.meta.get('nextjs')).toBe(5);
    });
  });

  describe('calculateConfidence', () => {
    it('should return high confidence for high scores with multiple signals', () => {
      expect(calculateConfidence(10, 3)).toBe('high');
    });

    it('should return medium confidence for moderate scores', () => {
      expect(calculateConfidence(5, 1)).toBe('medium');
    });

    it('should return low confidence for low scores', () => {
      expect(calculateConfidence(2, 1)).toBe('low');
    });

    it('should require multiple signals for high confidence', () => {
      expect(calculateConfidence(10, 1)).toBe('medium');
    });
  });

  describe('resolveTraits', () => {
    it('should pick the highest scoring framework', () => {
      const scores = {
        framework: new Map([['react', 7], ['vue', 3]]),
        meta: new Map([['nextjs', 5]]),
        state: new Map([['redux', 4]]),
        data: new Map([['tanstack_query', 3]]),
        tooling: new Map([['webpack', 2]]),
      };

      const matches: MatchedSignal[] = [{ signal: { id: 'test', category: 'framework', label: 'react', weight: 5, prodSafe: true, check: () => true }, score: 5 }];
      const traits = resolveTraits(scores, matches, false);

      expect(traits.framework_primary).toBe('react');
      expect(traits.framework_meta).toContain('nextjs');
      expect(traits.state_management).toContain('redux');
    });

    it('should return unknown for empty framework scores', () => {
      const scores = {
        framework: new Map(),
        meta: new Map(),
        state: new Map(),
        data: new Map(),
        tooling: new Map(),
      };

      const traits = resolveTraits(scores, [], false);
      expect(traits.framework_primary).toBe('unknown');
    });

    it('should include debug signals when requested', () => {
      const scores = {
        framework: new Map([['react', 5]]),
        meta: new Map(),
        state: new Map(),
        data: new Map(),
        tooling: new Map(),
      };

      const matches: MatchedSignal[] = [
        { signal: { id: 'react-test', category: 'framework', label: 'react', weight: 5, prodSafe: true, check: () => true }, score: 5 },
      ];

      const traits = resolveTraits(scores, matches, true);
      expect(traits.debug_signals).toBeDefined();
      expect(traits.debug_signals).toContain('react-test:5');
    });

    it('should not include debug signals when not requested', () => {
      const scores = {
        framework: new Map([['react', 5]]),
        meta: new Map(),
        state: new Map(),
        data: new Map(),
        tooling: new Map(),
      };

      const traits = resolveTraits(scores, [], false);
      expect(traits.debug_signals).toBeUndefined();
    });

    it('should include detector version', () => {
      const scores = {
        framework: new Map(),
        meta: new Map(),
        state: new Map(),
        data: new Map(),
        tooling: new Map(),
      };

      const traits = resolveTraits(scores, [], false);
      expect(traits.version).toBe(DETECTOR_VERSION);
    });
  });
});

// ============================================================================
// Dedupe Tests
// ============================================================================

describe('Dedupe', () => {
  beforeEach(() => {
    resetDetectionState();
  });

  afterEach(() => {
    resetDetectionState();
  });

  describe('generateTraitsHash', () => {
    it('should generate consistent hashes for same traits', () => {
      const traits: TechStackTraits = {
        framework_primary: 'react',
        framework_meta: ['nextjs'],
        state_management: ['redux'],
        data_layer: [],
        tooling: ['webpack'],
        confidence: 'high',
        version: '1.0.0',
      };

      const hash1 = generateTraitsHash(traits);
      const hash2 = generateTraitsHash(traits);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different traits', () => {
      const traits1: TechStackTraits = {
        framework_primary: 'react',
        framework_meta: [],
        state_management: [],
        data_layer: [],
        tooling: [],
        confidence: 'high',
        version: '1.0.0',
      };

      const traits2: TechStackTraits = {
        framework_primary: 'vue',
        framework_meta: [],
        state_management: [],
        data_layer: [],
        tooling: [],
        confidence: 'high',
        version: '1.0.0',
      };

      expect(generateTraitsHash(traits1)).not.toBe(generateTraitsHash(traits2));
    });

    it('should ignore debug_signals and version when hashing', () => {
      const traits1: TechStackTraits = {
        framework_primary: 'react',
        framework_meta: [],
        state_management: [],
        data_layer: [],
        tooling: [],
        confidence: 'high',
        version: '1.0.0',
        debug_signals: ['signal-1'],
      };

      const traits2: TechStackTraits = {
        framework_primary: 'react',
        framework_meta: [],
        state_management: [],
        data_layer: [],
        tooling: [],
        confidence: 'high',
        version: '2.0.0', // Different version
        debug_signals: ['signal-2'], // Different debug signals
      };

      expect(generateTraitsHash(traits1)).toBe(generateTraitsHash(traits2));
    });
  });

  describe('shouldSkipDetection', () => {
    it('should return false initially', () => {
      expect(shouldSkipDetection()).toBe(false);
    });

    it('should return true after markDetectionComplete', () => {
      const traits: TechStackTraits = {
        framework_primary: 'react',
        framework_meta: [],
        state_management: [],
        data_layer: [],
        tooling: [],
        confidence: 'high',
        version: '1.0.0',
      };

      markDetectionComplete(traits);
      expect(shouldSkipDetection()).toBe(true);
    });

    it('should return false after resetDetectionState', () => {
      const traits: TechStackTraits = {
        framework_primary: 'react',
        framework_meta: [],
        state_management: [],
        data_layer: [],
        tooling: [],
        confidence: 'high',
        version: '1.0.0',
      };

      markDetectionComplete(traits);
      resetDetectionState();
      expect(shouldSkipDetection()).toBe(false);
    });
  });
});

// ============================================================================
// PostHog Integration Tests
// ============================================================================

describe('PostHog Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendTechTraitsToPosthog', () => {
    it('should send tech_stack_detected event', () => {
      const traits: TechStackTraits = {
        framework_primary: 'react',
        framework_meta: ['nextjs'],
        state_management: ['redux'],
        data_layer: ['tanstack_query'],
        tooling: ['webpack'],
        confidence: 'high',
        version: '1.0.0',
      };

      sendTechTraitsToPosthog(traits, false);

      expect(posthog.capture).toHaveBeenCalledWith(
        'tech_stack_detected',
        expect.objectContaining({
          framework_primary: 'react',
          framework_meta: ['nextjs'],
          confidence: 'high',
          detector_version: '1.0.0',
        })
      );
    });

    it('should set person properties', () => {
      const traits: TechStackTraits = {
        framework_primary: 'vue',
        framework_meta: ['nuxt'],
        state_management: ['pinia'],
        data_layer: [],
        tooling: [],
        confidence: 'medium',
        version: '1.0.0',
      };

      sendTechTraitsToPosthog(traits, false);

      expect(posthog.people.set).toHaveBeenCalledWith(
        expect.objectContaining({
          tech_framework_primary: 'vue',
          tech_confidence: 'medium',
          tech_framework_meta: 'nuxt',
          tech_state_management: 'pinia',
        })
      );
    });

    it('should not include debug_signals in event', () => {
      const traits: TechStackTraits = {
        framework_primary: 'react',
        framework_meta: [],
        state_management: [],
        data_layer: [],
        tooling: [],
        confidence: 'low',
        version: '1.0.0',
        debug_signals: ['secret-signal'],
      };

      sendTechTraitsToPosthog(traits, false);

      const captureCall = (posthog.capture as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(captureCall[1]).not.toHaveProperty('debug_signals');
    });
  });
});

// ============================================================================
// Integration Tests - Real Scenarios
// ============================================================================

describe('Integration: Real Tech Stack Scenarios', () => {
  describe('React + Next.js', () => {
    it('should detect React + Next.js with high confidence', () => {
      const ctx = createMockContext({
        globals: {
          __REACT_DEVTOOLS_GLOBAL_HOOK__: {},
          __NEXT_DATA__: { page: '/', buildId: 'test' },
        },
        scriptSrcs: ['https://example.com/_next/static/chunks/main.js'],
        elements: ['__next'],
      });

      const matches = runSignals(ctx);
      const scores = aggregateScores(matches);
      const traits = resolveTraits(scores, matches, false);

      expect(traits.framework_primary).toBe('react');
      expect(traits.framework_meta).toContain('nextjs');
      expect(traits.confidence).toBe('high');
    });
  });

  describe('Vue + Nuxt', () => {
    it('should detect Vue + Nuxt with high confidence', () => {
      const ctx = createMockContext({
        globals: {
          __VUE__: {},
          __VUE_DEVTOOLS_GLOBAL_HOOK__: {},
          __NUXT__: { state: {} },
        },
        scriptSrcs: ['https://example.com/_nuxt/app.js'],
      });

      const matches = runSignals(ctx);
      const scores = aggregateScores(matches);
      const traits = resolveTraits(scores, matches, false);

      expect(traits.framework_primary).toBe('vue');
      expect(traits.framework_meta).toContain('nuxt');
      expect(traits.confidence).toBe('high');
    });
  });

  describe('Angular', () => {
    it('should detect Angular with medium-high confidence', () => {
      const ctx = createMockContext({
        globals: {
          Zone: {},
          ng: {},
        },
        elements: ['ng-version'],
      });

      const matches = runSignals(ctx);
      const scores = aggregateScores(matches);
      const traits = resolveTraits(scores, matches, false);

      expect(traits.framework_primary).toBe('angular');
      expect(traits.confidence).not.toBe('low');
    });
  });

  describe('Unknown / Clean browser', () => {
    it('should return unknown with low confidence', () => {
      const ctx = createMockContext({});

      const matches = runSignals(ctx);
      const scores = aggregateScores(matches);
      const traits = resolveTraits(scores, matches, false);

      expect(traits.framework_primary).toBe('unknown');
      expect(traits.confidence).toBe('low');
      expect(traits.framework_meta).toEqual([]);
    });
  });

  describe('Multiple state management tools', () => {
    it('should detect multiple state tools', () => {
      const ctx = createMockContext({
        globals: {
          __REACT_DEVTOOLS_GLOBAL_HOOK__: {},
          __REDUX_DEVTOOLS_EXTENSION__: {},
          __MOBX_DEVTOOLS_GLOBAL_HOOK__: {},
        },
      });

      const matches = runSignals(ctx);
      const scores = aggregateScores(matches);
      const traits = resolveTraits(scores, matches, false);

      expect(traits.state_management).toContain('redux');
      expect(traits.state_management).toContain('mobx');
    });
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  it('should handle malformed window objects gracefully', () => {
    const ctx: DetectionContext = {
      window: { toString: () => { throw new Error('boom'); } } as unknown as DetectionContext['window'],
      document: {} as Document,
      scriptSrcs: [],
      isProduction: false,
    };

    expect(() => runSignals(ctx)).not.toThrow();
  });

  it('should handle null script srcs', () => {
    const ctx = createMockContext({
      scriptSrcs: [null as unknown as string, undefined as unknown as string, ''],
    });

    expect(() => runSignals(ctx)).not.toThrow();
  });
});
