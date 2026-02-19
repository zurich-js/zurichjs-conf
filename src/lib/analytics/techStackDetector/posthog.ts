/**
 * PostHog Integration for Tech Stack Detection
 *
 * Single choke point for sending tech stack traits to PostHog.
 * Uses the existing analytics wrapper for consistency.
 *
 * @module techStackDetector/posthog
 */

import posthog from 'posthog-js';
import type { TechStackTraits } from './types';

/**
 * Properties sent with the tech_stack_detected event.
 * Never includes debug_signals in production.
 */
interface TechStackEventProperties {
  framework_primary: string;
  framework_meta: string[];
  state_management: string[];
  data_layer: string[];
  tooling: string[];
  confidence: string;
  detector_version: string;
}

/**
 * Checks if PostHog is initialized and ready to accept events.
 *
 * @returns true if PostHog is ready
 */
function isPostHogReady(): boolean {
  try {
    // Check if PostHog has a distinct_id (meaning it's initialized)
    const distinctId = posthog.get_distinct_id();
    return !!distinctId;
  } catch {
    return false;
  }
}

/**
 * Sends tech stack traits to PostHog.
 *
 * This is the single choke point for all PostHog interactions from the detector.
 * It sends:
 * 1. A one-time `tech_stack_detected` event with full traits
 * 2. Person properties for the detected traits (for filtering/segmentation)
 *
 * @param traits - Detected tech stack traits
 * @param debug - Whether to log debug info
 *
 * @example
 * const traits = await detectTechStack();
 * sendTechTraitsToPosthog(traits, false);
 */
export function sendTechTraitsToPosthog(
  traits: TechStackTraits,
  debug: boolean
): void {
  if (!isPostHogReady()) {
    if (debug) {
      console.log('[TechStackDetector] PostHog not ready, skipping send');
    }
    return;
  }

  // Build event properties (never include debug_signals)
  const eventProperties: TechStackEventProperties = {
    framework_primary: traits.framework_primary,
    framework_meta: traits.framework_meta,
    state_management: traits.state_management,
    data_layer: traits.data_layer,
    tooling: traits.tooling,
    confidence: traits.confidence,
    detector_version: traits.version,
  };

  try {
    // Send the one-time detection event
    posthog.capture('tech_stack_detected', eventProperties);

    // Also set person properties for segmentation
    // Using setPersonPropertiesForFlags for flags + people.set for general props
    posthog.people.set({
      tech_framework_primary: traits.framework_primary,
      tech_confidence: traits.confidence,
      // Store arrays as comma-separated strings for easier filtering
      tech_framework_meta: traits.framework_meta.join(',') || 'none',
      tech_state_management: traits.state_management.join(',') || 'none',
      tech_data_layer: traits.data_layer.join(',') || 'none',
      tech_tooling: traits.tooling.join(',') || 'none',
      tech_detector_version: traits.version,
    });

    if (debug) {
      console.log('[TechStackDetector] Sent to PostHog:', eventProperties);
    }
  } catch (error) {
    // Never throw from PostHog operations
    if (debug) {
      console.log('[TechStackDetector] PostHog send error (suppressed):', error);
    }
  }
}

/**
 * Person properties that will be set on the user.
 * Documented here for reference.
 *
 * | Property | Type | Description |
 * |----------|------|-------------|
 * | tech_framework_primary | string | Primary framework (react, vue, etc.) |
 * | tech_confidence | string | Detection confidence level |
 * | tech_framework_meta | string | Comma-separated meta-frameworks |
 * | tech_state_management | string | Comma-separated state tools |
 * | tech_data_layer | string | Comma-separated data tools |
 * | tech_tooling | string | Comma-separated build tools |
 * | tech_detector_version | string | Detector version for evolution |
 */
export const PERSON_PROPERTIES = [
  'tech_framework_primary',
  'tech_confidence',
  'tech_framework_meta',
  'tech_state_management',
  'tech_data_layer',
  'tech_tooling',
  'tech_detector_version',
] as const;
