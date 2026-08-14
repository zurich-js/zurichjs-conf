/**
 * Speaker Guide Analytics Events
 * Interactions on the unlisted /speaker-guide page and its Faru chat
 */

import type { BaseEventProperties } from './base';

export interface SpeakerGuideChatBannerClickedEvent {
  event: 'speaker_guide_chat_banner_clicked';
  properties: BaseEventProperties;
}

export interface SpeakerGuideQuicklinkClickedEvent {
  event: 'speaker_guide_quicklink_clicked';
  properties: BaseEventProperties & {
    link_label: string;
    link_sublabel?: string;
    travel_time?: string;
    link_url: string;
  };
}

export interface SpeakerGuideTocClickedEvent {
  event: 'speaker_guide_toc_clicked';
  properties: BaseEventProperties & {
    section_id: string;
    section_label: string;
    toc_variant: 'sidebar' | 'inline';
  };
}

export interface SpeakerGuideQuestionAskedEvent {
  event: 'speaker_guide_question_asked';
  properties: BaseEventProperties & {
    /** Privacy: the raw question never leaves the page — length only. */
    question_length: number;
    question_source: 'typed' | 'suggestion';
    results_count: number;
    answered: boolean;
    matched_sections: string[];
  };
}

export interface SpeakerGuideAnswerSourceClickedEvent {
  event: 'speaker_guide_answer_source_clicked';
  properties: BaseEventProperties & {
    section_id: string;
    section_title: string;
  };
}

export interface SpeakerGuideChatResetEvent {
  event: 'speaker_guide_chat_reset';
  properties: BaseEventProperties & {
    messages_count: number;
  };
}

export interface SpeakerGuideHowItWorksOpenedEvent {
  event: 'speaker_guide_how_it_works_opened';
  properties: BaseEventProperties;
}
