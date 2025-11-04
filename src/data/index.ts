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
  TICKET_FEATURES,
  TICKET_METADATA,
  STAGE_COPY,
  DISCOUNT_EXPIRY_DATE,
} from './tickets';
export { timelineData } from './timeline';
export { footerData } from './footer';

