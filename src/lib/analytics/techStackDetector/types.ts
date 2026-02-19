/**
 * Tech Stack Detector Types
 *
 * Low-cardinality types for detecting visitor's frontend tech stack
 * based on their installed browser DevTools extensions.
 *
 * NOTE: We only detect what the VISITOR uses (via their extensions),
 * not what the website is built with.
 *
 * @module techStackDetector/types
 */

/**
 * Current version of the tech stack detector.
 * Increment when adding new signals or changing detection logic.
 */
export const DETECTOR_VERSION = '1.1.0';

/**
 * Primary frontend framework detected via DevTools extension.
 *
 * @example
 * const framework: FrameworkPrimary = 'react';
 */
export type FrameworkPrimary =
  | 'react'
  | 'vue'
  | 'angular'
  | 'svelte'
  | 'solid'
  | 'unknown';

/**
 * State management library detected via DevTools extension.
 *
 * @example
 * const state: StateTool = 'redux';
 */
export type StateTool = 'redux' | 'mobx';

/**
 * Data fetching/caching library detected via DevTools extension.
 *
 * @example
 * const data: DataTool = 'tanstack_query';
 */
export type DataTool = 'tanstack_query' | 'apollo' | 'urql';

/**
 * Confidence level of detection.
 * - 'none': No extensions detected (visitor may not be a developer)
 * - 'low': Single extension detected
 * - 'high': Multiple extensions detected
 *
 * @example
 * const confidence: DetectionConfidence = 'high';
 */
export type DetectionConfidence = 'none' | 'low' | 'high';

/**
 * Signal category for organizing detection checks.
 */
export type SignalCategory = 'framework' | 'state' | 'data';

/**
 * Final detected tech stack traits.
 * This is what gets sent to PostHog for persona building.
 *
 * @example
 * const traits: TechStackTraits = {
 *   framework_primary: 'react',
 *   state_management: ['redux'],
 *   data_layer: ['apollo'],
 *   confidence: 'high',
 *   version: '1.1.0',
 * };
 */
export interface TechStackTraits {
  /** Primary frontend framework based on DevTools extension */
  framework_primary: FrameworkPrimary;

  /** State management tools based on DevTools extensions */
  state_management: StateTool[];

  /** Data fetching tools based on DevTools extensions */
  data_layer: DataTool[];

  /** Confidence level - 'none' means no dev extensions detected */
  confidence: DetectionConfidence;

  /** Detector version for tracking evolution */
  version: string;

  /**
   * Debug signals that triggered detection.
   * ONLY populated in development mode, NEVER sent to PostHog.
   */
  debug_signals?: string[];
}

/**
 * A detection signal definition.
 * Signals are the building blocks of tech stack detection.
 *
 * @example
 * const reactSignal: Signal = {
 *   id: 'react-devtools',
 *   category: 'framework',
 *   label: 'react',
 *   weight: 5,
 *   prodSafe: true,
 *   check: (ctx) => !!ctx.window?.__REACT_DEVTOOLS_GLOBAL_HOOK__,
 * };
 */
export interface Signal {
  /** Unique identifier for the signal */
  id: string;

  /** Category for grouping signals */
  category: SignalCategory;

  /** The tech label this signal indicates */
  label: string;

  /**
   * Weight of this signal (1-5).
   * Higher weight = stronger indicator.
   */
  weight: number;

  /**
   * Whether this signal is safe to check in production.
   */
  prodSafe: boolean;

  /**
   * Check function that returns true if signal is detected.
   * Must be synchronous, cheap, and never throw.
   */
  check: (ctx: DetectionContext) => boolean;
}

/**
 * Matched signal with its score contribution.
 */
export interface MatchedSignal {
  signal: Signal;
  score: number;
}

/**
 * Context provided to signal checks.
 * Contains safe references to browser APIs.
 */
export interface DetectionContext {
  /** Window object reference (may be undefined in SSR) */
  window?: Window & {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: unknown;
    __VUE_DEVTOOLS_GLOBAL_HOOK__?: unknown;
    __ANGULAR_DEVTOOLS_GLOBAL_HOOK__?: unknown;
    __SVELTE_DEVTOOLS_GLOBAL_HOOK__?: unknown;
    __SOLID_DEVTOOLS_GLOBAL_HOOK__?: unknown;
    __REDUX_DEVTOOLS_EXTENSION__?: unknown;
    __MOBX_DEVTOOLS_GLOBAL_HOOK__?: unknown;
    __APOLLO_DEVTOOLS_GLOBAL_HOOK__?: unknown;
    __URQL_DEVTOOLS__?: unknown;
    __REACT_QUERY_DEVTOOLS__?: unknown;
    [key: string]: unknown;
  };

  /** Document reference for DOM checks */
  document?: Document;

  /** Array of script src attributes (not used currently) */
  scriptSrcs: string[];

  /** Whether we're in production mode */
  isProduction: boolean;
}

/**
 * Aggregated scores by category and label.
 */
export interface ScoreMap {
  framework: Map<string, number>;
  state: Map<string, number>;
  data: Map<string, number>;
}

/**
 * Options for initializing tech stack detection.
 *
 * @example
 * initTechStackDetection({ force: true, debug: true });
 */
export interface InitTechStackDetectionOptions {
  /**
   * Force detection even if already run this session.
   * Useful for testing.
   * Default: false
   */
  force?: boolean;

  /**
   * Enable debug logging.
   * Default: process.env.NODE_ENV === 'development'
   */
  debug?: boolean;
}

/**
 * Session storage data structure for dedupe.
 */
export interface SessionStorageData {
  /** ISO timestamp when detection ran */
  detected_at: string;

  /** Stable hash of traits payload */
  traits_hash: string;
}

/**
 * Storage key for session dedupe.
 */
export const SESSION_STORAGE_KEY = 'zjs:techStack:v1';

/**
 * Minimum signal count for each confidence level.
 */
export const CONFIDENCE_THRESHOLDS = {
  high: 2,  // 2+ extensions detected
  low: 1,   // 1 extension detected
  none: 0,  // no extensions detected
} as const;
