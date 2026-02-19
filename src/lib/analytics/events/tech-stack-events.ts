/**
 * Tech Stack Detection Events
 *
 * Events related to frontend tech stack detection for persona building.
 */

import type { BaseEventProperties } from './base';

/**
 * Event fired when user's tech stack is detected.
 * Sent once per session, deduped by traits hash.
 */
export interface TechStackDetectedEvent {
  event: 'tech_stack_detected';
  properties: BaseEventProperties & {
    /** Primary frontend framework detected */
    framework_primary: 'react' | 'vue' | 'angular' | 'svelte' | 'solid' | 'unknown';
    /** Meta-frameworks detected (Next.js, Nuxt, etc.) */
    framework_meta: string[];
    /** State management tools detected (Redux, Zustand, etc.) */
    state_management: string[];
    /** Data fetching tools detected (TanStack Query, Apollo, etc.) */
    data_layer: string[];
    /** Build tools detected (Vite, Webpack, etc.) */
    tooling: string[];
    /** Confidence level of the detection */
    confidence: 'low' | 'medium' | 'high';
    /** Detector version for tracking evolution */
    detector_version: string;
  };
}
