/**
 * Shared types for program admin tab components
 */

import type { ProgramScheduleItemRecord } from '@/lib/types/program-schedule';
import type { ProgramSession } from '@/lib/types/program';
import type { SpeakerWithSessions } from '@/components/admin/speakers';
import type { ScheduleSlotDraft } from './utils';

export interface ProgramTabsProps {
  sessions: ProgramSession[];
  speakers: SpeakerWithSessions[];
  scheduleItems: ProgramScheduleItemRecord[];
  isLoading?: boolean;
  onEditSpeaker: (speaker: SpeakerWithSessions) => void;
  onCreateSpeaker: () => void;
  onToggleSpeakerVisibility: (id: string, isVisible: boolean) => void;
  onToggleSpeakerFeatured: (id: string, isFeatured: boolean) => void;
  togglingVisibilityId?: string | null;
  togglingFeaturedId?: string | null;
  onRefresh: () => void;
  onToast: (title: string, message?: string, type?: 'success' | 'error') => void;
}

export type SessionModalState =
  | { mode: 'create'; speakerId?: string | null }
  | { mode: 'edit'; session: ProgramSession }
  | null;

export type ScheduleModalState =
  | { mode: 'create'; draft?: ScheduleSlotDraft }
  | { mode: 'edit'; item: ProgramScheduleItemRecord }
  | null;
