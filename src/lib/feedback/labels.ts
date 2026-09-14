/** Display labels shared by the public feedback form and the admin rollups. */

import type { SessionFeedbackSummary } from '@/lib/types/session-feedback';

export const KIND_LABELS: Record<NonNullable<SessionFeedbackSummary['kind']>, string> = {
  talk: 'Talk',
  workshop: 'Workshop',
  panel: 'Panel',
};
