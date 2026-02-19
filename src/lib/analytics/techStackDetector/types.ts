/**
 * Tech Stack Detector Types
 *
 * Low-cardinality types for detecting user's frontend tech stack.
 * All types are designed for analytics persona building without
 * compromising privacy or performance.
 *
 * @module techStackDetector/types
 */

/**
 * Current version of the tech stack detector.
 * Increment when adding new signals or changing detection logic.
 */
export const DETECTOR_VERSION = '1.0.0';

/**
 * Primary frontend framework detected.
 * Limited to major frameworks for low cardinality.
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
 * Meta-framework or build tool detected.
 * These sit on top of or alongside primary frameworks.
 *
 * @example
 * const meta: TechMeta = 'nextjs';
 */
export type TechMeta =
  | 'nextjs'
  | 'nuxt'
  | 'sveltekit'
  | 'gatsby'
  | 'remix'
  | 'astro'
  | 'storybook'
  | 'vite'
  | 'webpack'
  | 'unknown';

/**
 * State management library detected.
 *
 * @example
 * const state: StateTool = 'redux';
 */
export type StateTool =
  | 'redux'
  | 'mobx'
  | 'zustand'
  | 'pinia'
  | 'vuex'
  | 'ngrx';

/**
 * Data fetching/caching library detected.
 *
 * @example
 * const data: DataTool = 'tanstack_query';
 */
export type DataTool =
  | 'tanstack_query'
  | 'apollo'
  | 'urql'
  | 'swr';

/**
 * Confidence level of detection.
 * - 'low': Single weak signal or ambiguous detection
 * - 'medium': Multiple signals but not definitive
 * - 'high': Strong signals with high certainty
 *
 * @example
 * const confidence: DetectionConfidence = 'high';
 */
export type DetectionConfidence = 'low' | 'medium' | 'high';

/**
 * Signal category for organizing detection checks.
 */
export type SignalCategory =
  | 'framework'
  | 'meta'
  | 'state'
  | 'data'
  | 'tooling';

/**
 * Final detected tech stack traits.
 * This is what gets sent to PostHog for persona building.
 *
 * @example
 * const traits: TechStackTraits = {
 *   framework_primary: 'react',
 *   framework_meta: ['nextjs'],
 *   state_management: ['redux'],
 *   data_layer: ['tanstack_query'],
 *   tooling: ['webpack'],
 *   confidence: 'high',
 *   version: '1.0.0',
 * };
 */
export interface TechStackTraits {
  /** Primary frontend framework (single value) */
  framework_primary: FrameworkPrimary;

  /** Meta-frameworks or tools detected (can be multiple) */
  framework_meta: TechMeta[];

  /** State management libraries detected */
  state_management: StateTool[];

  /** Data fetching libraries detected */
  data_layer: DataTool[];

  /** Build tools and dev tooling detected */
  tooling: TechMeta[];

  /** Confidence level of the overall detection */
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
 *   weight: 3,
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
   * - 1: Very weak hint
   * - 2: Weak indicator
   * - 3: Moderate indicator
   * - 4: Strong indicator
   * - 5: Definitive signal
   */
  weight: number;

  /**
   * Whether this signal is safe to check in production.
   * Some signals (like dev tools) may only be present in dev.
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
    __NEXT_DATA__?: unknown;
    __NUXT__?: unknown;
    __VUE__?: unknown;
    __VUE_DEVTOOLS_GLOBAL_HOOK__?: unknown;
    __SVELTE_HMR_CALLBACK__?: unknown;
    __REDUX_DEVTOOLS_EXTENSION__?: unknown;
    __MOBX_DEVTOOLS_GLOBAL_HOOK__?: unknown;
    __APOLLO_CLIENT__?: unknown;
    __URQL_DEVTOOLS__?: unknown;
    Storybook?: unknown;
    ng?: unknown;
    Zone?: unknown;
    [key: string]: unknown;
  };

  /** Document reference for DOM checks */
  document?: Document;

  /** Array of script src attributes */
  scriptSrcs: string[];

  /** Whether we're in production mode */
  isProduction: boolean;
}

/**
 * Aggregated scores by category and label.
 */
export interface ScoreMap {
  framework: Map<string, number>;
  meta: Map<string, number>;
  state: Map<string, number>;
  data: Map<string, number>;
  tooling: Map<string, number>;
}

/**
 * Options for initializing tech stack detection.
 *
 * @example
 * initTechStackDetection({
 *   enabled: true,
 *   force: false,
 *   debug: process.env.NODE_ENV === 'development',
 * });
 */
export interface InitTechStackDetectionOptions {
  /**
   * Whether detection is enabled.
   * Default: Based on FF_TECH_STACK_DETECTION env var or feature flag.
   */
  enabled?: boolean;

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
 * Minimum total score threshold for each confidence level.
 */
export const CONFIDENCE_THRESHOLDS = {
  high: 8,
  medium: 4,
  low: 0,
} as const;
