/**
 * Speaker Analytics Events
 * Events related to public speaker profile engagement
 */

import type { BaseEventProperties } from './base';

export interface SpeakerViewedEvent {
  event: 'speaker_viewed';
  properties: BaseEventProperties & {
    speaker_slug: string;
    speaker_name: string;
    has_talk: boolean;
    has_workshop: boolean;
  };
}
