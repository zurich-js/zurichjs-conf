/**
 * Tech Stack Detection Events
 *
 * Events related to frontend tech stack detection for persona building.
 * Detects visitor's installed DevTools extensions to infer their tech stack.
 */

import type { BaseEventProperties } from './base';

/**
 * Event fired when visitor's tech stack is detected via DevTools extensions.
 * Sent once per session, deduped by traits hash.
 */
export interface TechStackDetectedEvent {
  event: 'tech_stack_detected';
  properties: BaseEventProperties & {
    /** Primary frontend framework (based on DevTools extension) */
    framework_primary: 'react' | 'vue' | 'angular' | 'svelte' | 'solid' | 'unknown';
    /** State management tools (based on DevTools extensions) */
    state_management: string[];
    /** Data fetching tools (based on DevTools extensions) */
    data_layer: string[];
    /** Confidence: 'none' = no extensions, 'low' = 1 extension, 'high' = 2+ */
    confidence: 'none' | 'low' | 'high';
    /** Detector version for tracking evolution */
    detector_version: string;
  };
}
