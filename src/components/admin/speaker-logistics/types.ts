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
import type { SendSpeakerLogisticsRequestsResponse } from '@/pages/api/admin/speaker-logistics/remind';

export type {
  SpeakerLogisticsOverviewResponse,
  SpeakerLogisticsAdminRow,
  SpeakerLogisticsStats,
  SpeakerLogisticsEventStats,
  SpeakerLogisticsStatus,
  SendSpeakerLogisticsRequestsResponse,
};

export type SpeakerLogisticsFilter = 'all' | 'pending' | 'submitted' | 'plus_ones' | 'dietary';
