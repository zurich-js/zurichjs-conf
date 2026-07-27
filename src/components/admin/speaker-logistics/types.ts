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

export type {
  SpeakerLogisticsOverviewResponse,
  SpeakerLogisticsAdminRow,
  SpeakerLogisticsStats,
  SpeakerLogisticsEventStats,
  SpeakerLogisticsStatus,
};

export type SpeakerLogisticsFilter = 'all' | 'pending' | 'submitted' | 'plus_ones' | 'dietary';
