/**
 * After Party Admin Types
 */

import type {
  AfterPartyAttendee,
  AfterPartyOverviewResponse,
  AfterPartySource,
  AfterPartyStats,
  AfterPartyTicketSummary,
} from '@/lib/types/after-party';

export type { AfterPartyOverviewResponse, AfterPartyAttendee, AfterPartySource, AfterPartyStats, AfterPartyTicketSummary };

export type AfterPartyFilter = 'all' | AfterPartySource | 'needs_ticket';
