/**
 * Tech Stack Detection Scoring Engine
 *
 * Runs signals and aggregates scores to determine the final tech stack traits.
 * Uses a weighted scoring system to combine multiple signals for confidence.
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
 * Collects all safe data sources needed for signal checks.
 *
 * @param isProduction - Whether we're in production mode
 * @returns Detection context with all available data
 *
 * @example
 * const ctx = buildContext(true);
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

  // Collect script srcs safely
  const scriptSrcs: string[] = [];
  try {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i]?.src;
      if (src) {
        scriptSrcs.push(src);
      }
    }
  } catch {
    // Ignore errors collecting script srcs
  }

  return {
    window: window as unknown as DetectionContext['window'],
    document,
    scriptSrcs,
    isProduction,
  };
}

/**
 * Runs all applicable signals and returns matched ones.
 * Never throws - returns empty array on any error.
 *
 * @param ctx - Detection context
 * @returns Array of matched signals with scores
 *
 * @example
 * const ctx = buildContext(true);
 * const matches = runSignals(ctx);
 * // [{ signal: { id: 'react-devtools', ... }, score: 4 }, ...]
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
      // Signal simply doesn't match
    }
  }

  return matched;
}

/**
 * Aggregates matched signals into score maps by category.
 *
 * @param matches - Array of matched signals
 * @returns Score maps organized by category
 *
 * @example
 * const scores = aggregateScores(matches);
 * // { framework: Map { 'react' => 7 }, meta: Map { 'nextjs' => 9 }, ... }
 */
export function aggregateScores(matches: MatchedSignal[]): ScoreMap {
  const scores: ScoreMap = {
    framework: new Map(),
    meta: new Map(),
    state: new Map(),
    data: new Map(),
    tooling: new Map(),
  };

  for (const { signal, score } of matches) {
    const map = scores[signal.category];
    const existing = map.get(signal.label) || 0;
    map.set(signal.label, existing + score);
  }

  return scores;
}

/**
 * Determines confidence level based on total score and signal count.
 *
 * @param totalScore - Sum of all matched signal weights
 * @param signalCount - Number of signals matched
 * @returns Confidence level
 *
 * @example
 * const confidence = calculateConfidence(12, 4);
 * // 'high'
 */
export function calculateConfidence(
  totalScore: number,
  signalCount: number
): DetectionConfidence {
  // Require multiple signals for high confidence
  if (totalScore >= CONFIDENCE_THRESHOLDS.high && signalCount >= 2) {
    return 'high';
  }
  if (totalScore >= CONFIDENCE_THRESHOLDS.medium) {
    return 'medium';
  }
  return 'low';
}

/**
 * Picks the winner from a score map (highest score).
 *
 * @param map - Map of label to score
 * @returns Label with highest score, or undefined if empty
 *
 * @example
 * const winner = pickWinner(new Map([['react', 7], ['vue', 3]]));
 * // 'react'
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
 * Returns empty array if map is empty.
 *
 * @param map - Map of label to score
 * @returns Array of labels
 *
 * @example
 * const tools = getAllLabels(new Map([['redux', 5], ['zustand', 3]]));
 * // ['redux', 'zustand']
 */
function getAllLabels<T extends string>(map: Map<string, number>): T[] {
  return Array.from(map.keys()) as T[];
}

/**
 * Resolves final traits from aggregated scores.
 * Combines all category scores into the final TechStackTraits object.
 *
 * @param scores - Aggregated score maps
 * @param matches - Original matched signals (for debug output)
 * @param includeDebug - Whether to include debug_signals
 * @returns Final tech stack traits
 *
 * @example
 * const traits = resolveTraits(scores, matches, true);
 */
export function resolveTraits(
  scores: ScoreMap,
  matches: MatchedSignal[],
  includeDebug: boolean
): TechStackTraits {
  // Calculate total score for confidence
  let totalScore = 0;
  for (const map of Object.values(scores)) {
    for (const score of map.values()) {
      totalScore += score;
    }
  }

  const traits: TechStackTraits = {
    framework_primary: pickWinner<FrameworkPrimary>(scores.framework) || 'unknown',
    framework_meta: getAllLabels(scores.meta),
    state_management: getAllLabels(scores.state),
    data_layer: getAllLabels(scores.data),
    tooling: getAllLabels(scores.tooling),
    confidence: calculateConfidence(totalScore, matches.length),
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
 * Builds context, runs signals, and resolves traits.
 *
 * @param options - Detection options
 * @returns Promise resolving to detected traits
 *
 * @example
 * const traits = await detect({ isProduction: true, debug: false });
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
      framework_meta: [],
      state_management: [],
      data_layer: [],
      tooling: [],
      confidence: 'low',
      version: DETECTOR_VERSION,
    };
  }

  const matches = runSignals(ctx);
  const scores = aggregateScores(matches);

  return resolveTraits(scores, matches, options.debug);
}
