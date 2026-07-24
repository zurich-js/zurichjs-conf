/**
 * Apparel Admin Components
 * Barrel export for the apparel overview tab
 */

export { ApparelTab } from './ApparelTab';
export { ApparelStatsCards } from './ApparelStatsCards';
export { SizeBreakdownTable } from './SizeBreakdownTable';
export { ApparelTicketsTable } from './ApparelTicketsTable';
export { useApparelOverview, useSendApparelReminders } from './hooks';
export { fetchApparelOverview, sendApparelRemindersApi, apparelQueryKeys } from './api';
export type {
  ApparelOverviewResponse,
  ApparelTicketRow,
  ApparelSpeakerRow,
  ApparelStats,
  ApparelSpeakerStats,
  SendApparelRemindersResponse,
  ApparelFilter,
} from './types';
