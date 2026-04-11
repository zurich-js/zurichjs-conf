/**
 * Central data exports
 * Re-exports all configuration data for easy importing
 */

export { heroData } from './hero';
export { scheduleData } from './schedule';
export {
  publicProgramTabs,
  workshopProgramSections,
  workshopSlotCount,
} from './public-program';
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
export { sponsorsData } from './sponsors';
export { sponsorshipPageData } from './sponsorship';
export { learningData } from './landing-learn';
