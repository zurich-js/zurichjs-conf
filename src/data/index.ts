/**
 * Central data exports
 * Re-exports all configuration data for easy importing
 */

export { heroData } from './hero';
export { scheduleData } from './schedule';
export {
  ticketsData,
  createTicketDataFromStripe,
  mapStripePlanToTicketPlan,
  getStageEndDate,
  TICKET_FEATURES,
  TICKET_METADATA,
  STAGE_COPY,
} from './tickets';
export { timelineData } from './timeline';
export { footerData } from './footer';
export { sponsorsData } from './sponsors';
export { sponsorshipPageData } from './sponsorship';

