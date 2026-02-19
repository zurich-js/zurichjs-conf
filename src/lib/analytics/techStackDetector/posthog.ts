/**
 * PostHog Integration for Tech Stack Detection
 *
 * Single choke point for sending tech stack traits to PostHog.
 *
 * @module techStackDetector/posthog
 */

import posthog from 'posthog-js';
import type { TechStackTraits } from './types';

/**
 * Properties sent with the tech_stack_detected event.
 */
interface TechStackEventProperties {
  framework_primary: string;
  state_management: string[];
  data_layer: string[];
  confidence: string;
  detector_version: string;
}

/**
 * Checks if PostHog is initialized and ready to accept events.
 */
function isPostHogReady(): boolean {
  try {
    const distinctId = posthog.get_distinct_id();
    return !!distinctId;
  } catch {
    return false;
  }
}

/**
 * Sends tech stack traits to PostHog.
 *
 * @param traits - Detected tech stack traits
 * @param debug - Whether to log debug info
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
    state_management: traits.state_management,
    data_layer: traits.data_layer,
    confidence: traits.confidence,
    detector_version: traits.version,
  };

  try {
    // Send the one-time detection event
    posthog.capture('tech_stack_detected', eventProperties);

    // Set person properties for segmentation
    posthog.people.set({
      tech_framework_primary: traits.framework_primary,
      tech_confidence: traits.confidence,
      tech_state_management: traits.state_management.join(',') || 'none',
      tech_data_layer: traits.data_layer.join(',') || 'none',
      tech_detector_version: traits.version,
    });

    if (debug) {
      console.log('[TechStackDetector] Sent to PostHog:', eventProperties);
    }
  } catch (error) {
    if (debug) {
      console.log('[TechStackDetector] PostHog send error (suppressed):', error);
    }
  }
}
