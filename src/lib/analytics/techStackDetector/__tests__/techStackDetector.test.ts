/**
 * Unit Tests for Tech Stack Detector
 *
 * Tests detection of visitor's tech stack via browser DevTools extensions.
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

function createMockContext(options: {
  globals?: Record<string, unknown>;
  isProduction?: boolean;
}): DetectionContext {
  const { globals = {}, isProduction = false } = options;

  const mockWindow: DetectionContext['window'] = {
    ...globals,
  } as DetectionContext['window'];

  const mockDocument = {
    querySelector: vi.fn(() => null),
    getElementsByTagName: vi.fn(() => []),
  } as unknown as Document;

  return {
    window: mockWindow,
    document: mockDocument,
    scriptSrcs: [],
    isProduction,
  };
}

// ============================================================================
// Signal Tests
// ============================================================================

describe('Signals', () => {
  describe('getSafeSignals', () => {
    it('should return all signals (all are prodSafe)', () => {
      const devSignals = getSafeSignals(false);
      const prodSignals = getSafeSignals(true);
      expect(devSignals.length).toBe(prodSignals.length);
    });

    it('should have unique signal IDs', () => {
      const ids = SIGNALS.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should only have extension-based signals', () => {
      // All signals should check for DevTools extension globals
      for (const signal of SIGNALS) {
        expect(signal.id).toMatch(/devtools/i);
      }
    });
  });
});

// ============================================================================
// Scoring Tests
// ============================================================================

describe('Scoring', () => {
  describe('runSignals', () => {
    it('should detect React DevTools extension', () => {
      const ctx = createMockContext({
        globals: { __REACT_DEVTOOLS_GLOBAL_HOOK__: {} },
      });

      const matches = runSignals(ctx);
      expect(matches.some((m) => m.signal.id === 'react-devtools')).toBe(true);
    });

    it('should detect Vue DevTools extension', () => {
      const ctx = createMockContext({
        globals: { __VUE_DEVTOOLS_GLOBAL_HOOK__: {} },
      });

      const matches = runSignals(ctx);
      expect(matches.some((m) => m.signal.id === 'vue-devtools')).toBe(true);
    });

    it('should detect Redux DevTools extension', () => {
      const ctx = createMockContext({
        globals: { __REDUX_DEVTOOLS_EXTENSION__: {} },
      });

      const matches = runSignals(ctx);
      expect(matches.some((m) => m.signal.id === 'redux-devtools')).toBe(true);
    });

    it('should detect Apollo DevTools extension', () => {
      const ctx = createMockContext({
        globals: { __APOLLO_DEVTOOLS_GLOBAL_HOOK__: {} },
      });

      const matches = runSignals(ctx);
      expect(matches.some((m) => m.signal.id === 'apollo-devtools')).toBe(true);
    });

    it('should return empty array when no extensions installed', () => {
      const ctx = createMockContext({});
      const matches = runSignals(ctx);
      expect(matches.length).toBe(0);
    });

    it('should detect multiple extensions', () => {
      const ctx = createMockContext({
        globals: {
          __REACT_DEVTOOLS_GLOBAL_HOOK__: {},
          __REDUX_DEVTOOLS_EXTENSION__: {},
          __APOLLO_DEVTOOLS_GLOBAL_HOOK__: {},
        },
      });

      const matches = runSignals(ctx);
      expect(matches.length).toBe(3);
    });
  });

  describe('aggregateScores', () => {
    it('should aggregate scores by category', () => {
      const matches: MatchedSignal[] = [
        { signal: { id: 'react-devtools', category: 'framework', label: 'react', weight: 5, prodSafe: true, check: () => true }, score: 5 },
        { signal: { id: 'redux-devtools', category: 'state', label: 'redux', weight: 5, prodSafe: true, check: () => true }, score: 5 },
      ];

      const scores = aggregateScores(matches);

      expect(scores.framework.get('react')).toBe(5);
      expect(scores.state.get('redux')).toBe(5);
    });
  });

  describe('calculateConfidence', () => {
    it('should return high confidence for 2+ extensions', () => {
      expect(calculateConfidence(2)).toBe('high');
      expect(calculateConfidence(3)).toBe('high');
    });

    it('should return low confidence for 1 extension', () => {
      expect(calculateConfidence(1)).toBe('low');
    });

    it('should return none confidence for 0 extensions', () => {
      expect(calculateConfidence(0)).toBe('none');
    });
  });

  describe('resolveTraits', () => {
    it('should pick the framework from detected extension', () => {
      const scores = {
        framework: new Map([['react', 5]]),
        state: new Map([['redux', 5]]),
        data: new Map(),
      };

      const matches: MatchedSignal[] = [
        { signal: { id: 'react-devtools', category: 'framework', label: 'react', weight: 5, prodSafe: true, check: () => true }, score: 5 },
        { signal: { id: 'redux-devtools', category: 'state', label: 'redux', weight: 5, prodSafe: true, check: () => true }, score: 5 },
      ];

      const traits = resolveTraits(scores, matches, false);

      expect(traits.framework_primary).toBe('react');
      expect(traits.state_management).toContain('redux');
      expect(traits.confidence).toBe('high');
    });

    it('should return unknown when no extensions detected', () => {
      const scores = {
        framework: new Map(),
        state: new Map(),
        data: new Map(),
      };

      const traits = resolveTraits(scores, [], false);

      expect(traits.framework_primary).toBe('unknown');
      expect(traits.confidence).toBe('none');
    });

    it('should include debug signals when requested', () => {
      const scores = {
        framework: new Map([['react', 5]]),
        state: new Map(),
        data: new Map(),
      };

      const matches: MatchedSignal[] = [
        { signal: { id: 'react-devtools', category: 'framework', label: 'react', weight: 5, prodSafe: true, check: () => true }, score: 5 },
      ];

      const traits = resolveTraits(scores, matches, true);
      expect(traits.debug_signals).toBeDefined();
      expect(traits.debug_signals).toContain('react-devtools:5');
    });

    it('should include detector version', () => {
      const scores = {
        framework: new Map(),
        state: new Map(),
        data: new Map(),
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
        state_management: ['redux'],
        data_layer: [],
        confidence: 'high',
        version: '1.1.0',
      };

      const hash1 = generateTraitsHash(traits);
      const hash2 = generateTraitsHash(traits);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different traits', () => {
      const traits1: TechStackTraits = {
        framework_primary: 'react',
        state_management: [],
        data_layer: [],
        confidence: 'low',
        version: '1.1.0',
      };

      const traits2: TechStackTraits = {
        framework_primary: 'vue',
        state_management: [],
        data_layer: [],
        confidence: 'low',
        version: '1.1.0',
      };

      expect(generateTraitsHash(traits1)).not.toBe(generateTraitsHash(traits2));
    });
  });

  describe('shouldSkipDetection', () => {
    it('should return false initially', () => {
      expect(shouldSkipDetection()).toBe(false);
    });

    it('should return true after markDetectionComplete', () => {
      const traits: TechStackTraits = {
        framework_primary: 'react',
        state_management: [],
        data_layer: [],
        confidence: 'low',
        version: '1.1.0',
      };

      markDetectionComplete(traits);
      expect(shouldSkipDetection()).toBe(true);
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
        state_management: ['redux'],
        data_layer: ['apollo'],
        confidence: 'high',
        version: '1.1.0',
      };

      sendTechTraitsToPosthog(traits, false);

      expect(posthog.capture).toHaveBeenCalledWith(
        'tech_stack_detected',
        expect.objectContaining({
          framework_primary: 'react',
          state_management: ['redux'],
          data_layer: ['apollo'],
          confidence: 'high',
        })
      );
    });

    it('should set person properties', () => {
      const traits: TechStackTraits = {
        framework_primary: 'vue',
        state_management: ['mobx'],
        data_layer: [],
        confidence: 'low',
        version: '1.1.0',
      };

      sendTechTraitsToPosthog(traits, false);

      expect(posthog.people.set).toHaveBeenCalledWith(
        expect.objectContaining({
          tech_framework_primary: 'vue',
          tech_confidence: 'low',
          tech_state_management: 'mobx',
        })
      );
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration: Real Scenarios', () => {
  describe('React developer with Redux', () => {
    it('should detect React + Redux with high confidence', () => {
      const ctx = createMockContext({
        globals: {
          __REACT_DEVTOOLS_GLOBAL_HOOK__: {},
          __REDUX_DEVTOOLS_EXTENSION__: {},
        },
      });

      const matches = runSignals(ctx);
      const scores = aggregateScores(matches);
      const traits = resolveTraits(scores, matches, false);

      expect(traits.framework_primary).toBe('react');
      expect(traits.state_management).toContain('redux');
      expect(traits.confidence).toBe('high');
    });
  });

  describe('Vue developer', () => {
    it('should detect Vue with low confidence (single extension)', () => {
      const ctx = createMockContext({
        globals: {
          __VUE_DEVTOOLS_GLOBAL_HOOK__: {},
        },
      });

      const matches = runSignals(ctx);
      const scores = aggregateScores(matches);
      const traits = resolveTraits(scores, matches, false);

      expect(traits.framework_primary).toBe('vue');
      expect(traits.confidence).toBe('low');
    });
  });

  describe('Non-developer visitor', () => {
    it('should return unknown with none confidence', () => {
      const ctx = createMockContext({});

      const matches = runSignals(ctx);
      const scores = aggregateScores(matches);
      const traits = resolveTraits(scores, matches, false);

      expect(traits.framework_primary).toBe('unknown');
      expect(traits.confidence).toBe('none');
    });
  });
});
