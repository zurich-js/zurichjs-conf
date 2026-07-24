/**
 * Apparel Admin Types
 */

import type {
  ApparelOverviewResponse,
  ApparelTicketRow,
  ApparelSpeakerRow,
  ApparelStats,
  ApparelSpeakerStats,
} from '@/pages/api/admin/apparel';

export type {
  ApparelOverviewResponse,
  ApparelTicketRow,
  ApparelSpeakerRow,
  ApparelStats,
  ApparelSpeakerStats,
};

export interface SendApparelRemindersResponse {
  success: boolean;
  requested: number;
  sent: number;
  failed: number;
  skipped: number;
  failures: Array<{ ticketId: string; email: string; error?: string }>;
}

export type ApparelFilter = 'all' | 'missing' | 'complete';
