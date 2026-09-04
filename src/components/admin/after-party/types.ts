/**
 * After Party Admin Types
 */

import type { AfterPartyOverviewResponse } from '@/pages/api/admin/after-party';
import type {
  AfterPartyAttendee,
  AfterPartySource,
  AfterPartyStats,
  AfterPartyTicketSummary,
} from '@/lib/after-party';

export type { AfterPartyOverviewResponse, AfterPartyAttendee, AfterPartySource, AfterPartyStats, AfterPartyTicketSummary };

export type AfterPartyFilter = 'all' | AfterPartySource | 'needs_ticket';
