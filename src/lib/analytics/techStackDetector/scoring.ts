/**
 * Tech Stack Detection Scoring Engine
 *
 * Runs signals and aggregates scores to determine the final tech stack traits.
 *
 * @module techStackDetector/scoring
 */

import { getSafeSignals } from './signals';
import {
  CONFIDENCE_THRESHOLDS,
  DETECTOR_VERSION,
  type DetectionConfidence,
  type DetectionContext,
  type FrameworkPrimary,
  type MatchedSignal,
  type ScoreMap,
  type TechStackTraits,
} from './types';

/**
 * Builds detection context from the current browser environment.
 *
 * @param isProduction - Whether we're in production mode
 * @returns Detection context with all available data
 */
export function buildContext(isProduction: boolean): DetectionContext {
  // Server-side rendering check
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      window: undefined,
      document: undefined,
      scriptSrcs: [],
      isProduction,
    };
  }

  return {
    window: window as unknown as DetectionContext['window'],
    document,
    scriptSrcs: [],
    isProduction,
  };
}

/**
 * Runs all applicable signals and returns matched ones.
 * Never throws - returns empty array on any error.
 *
 * @param ctx - Detection context
 * @returns Array of matched signals with scores
 */
export function runSignals(ctx: DetectionContext): MatchedSignal[] {
  const signals = getSafeSignals(ctx.isProduction);
  const matched: MatchedSignal[] = [];

  for (const signal of signals) {
    try {
      if (signal.check(ctx)) {
        matched.push({
          signal,
          score: signal.weight,
        });
      }
    } catch {
      // Never throw on individual signal failure
    }
  }

  return matched;
}

/**
 * Aggregates matched signals into score maps by category.
 *
 * @param matches - Array of matched signals
 * @returns Score maps organized by category
 */
export function aggregateScores(matches: MatchedSignal[]): ScoreMap {
  const scores: ScoreMap = {
    framework: new Map(),
    state: new Map(),
    data: new Map(),
  };

  for (const { signal, score } of matches) {
    const map = scores[signal.category];
    if (map) {
      const existing = map.get(signal.label) || 0;
      map.set(signal.label, existing + score);
    }
  }

  return scores;
}

/**
 * Determines confidence level based on number of extensions detected.
 *
 * @param signalCount - Number of signals matched
 * @returns Confidence level
 */
export function calculateConfidence(signalCount: number): DetectionConfidence {
  if (signalCount >= CONFIDENCE_THRESHOLDS.high) {
    return 'high';
  }
  if (signalCount >= CONFIDENCE_THRESHOLDS.low) {
    return 'low';
  }
  return 'none';
}

/**
 * Picks the winner from a score map (highest score).
 *
 * @param map - Map of label to score
 * @returns Label with highest score, or undefined if empty
 */
function pickWinner<T extends string>(map: Map<string, number>): T | undefined {
  let winner: string | undefined;
  let maxScore = 0;

  for (const [label, score] of map) {
    if (score > maxScore) {
      maxScore = score;
      winner = label;
    }
  }

  return winner as T | undefined;
}

/**
 * Gets all labels from a score map as an array.
 *
 * @param map - Map of label to score
 * @returns Array of labels
 */
function getAllLabels<T extends string>(map: Map<string, number>): T[] {
  return Array.from(map.keys()) as T[];
}

/**
 * Resolves final traits from aggregated scores.
 *
 * @param scores - Aggregated score maps
 * @param matches - Original matched signals (for debug output)
 * @param includeDebug - Whether to include debug_signals
 * @returns Final tech stack traits
 */
export function resolveTraits(
  scores: ScoreMap,
  matches: MatchedSignal[],
  includeDebug: boolean
): TechStackTraits {
  const traits: TechStackTraits = {
    framework_primary: pickWinner<FrameworkPrimary>(scores.framework) || 'unknown',
    state_management: getAllLabels(scores.state),
    data_layer: getAllLabels(scores.data),
    confidence: calculateConfidence(matches.length),
    version: DETECTOR_VERSION,
  };

  // Add debug signals only when requested
  if (includeDebug && matches.length > 0) {
    traits.debug_signals = matches.map((m) => `${m.signal.id}:${m.score}`);
  }

  return traits;
}

/**
 * Main function to detect tech stack traits.
 *
 * @param options - Detection options
 * @returns Promise resolving to detected traits
 */
export async function detect(options: {
  isProduction: boolean;
  debug: boolean;
}): Promise<TechStackTraits> {
  const ctx = buildContext(options.isProduction);

  // Handle SSR case
  if (!ctx.window || !ctx.document) {
    return {
      framework_primary: 'unknown',
      state_management: [],
      data_layer: [],
      confidence: 'none',
      version: DETECTOR_VERSION,
    };
  }

  const matches = runSignals(ctx);
  const scores = aggregateScores(matches);

  return resolveTraits(scores, matches, options.debug);
}
