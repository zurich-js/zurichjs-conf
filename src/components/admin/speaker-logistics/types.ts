/**
 * Speaker Logistics Admin Types
 */

import type {
  SpeakerLogisticsOverviewResponse,
  SpeakerLogisticsAdminRow,
  SpeakerLogisticsStats,
  SpeakerLogisticsEventStats,
  SpeakerLogisticsStatus,
} from '@/pages/api/admin/speaker-logistics';
import type {
  ActivityGuestAdminRow,
  ActivityGuestsResponse,
} from '@/pages/api/admin/speaker-logistics/guests';

export type {
  SpeakerLogisticsOverviewResponse,
  SpeakerLogisticsAdminRow,
  SpeakerLogisticsStats,
  SpeakerLogisticsEventStats,
  SpeakerLogisticsStatus,
  ActivityGuestAdminRow,
  ActivityGuestsResponse,
};

export type SpeakerLogisticsFilter = 'all' | 'pending' | 'submitted' | 'plus_ones' | 'dietary';
