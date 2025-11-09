/**
 * Workshops Module Exports
 */

export { getPublishedWorkshops, getWorkshopById, getAllWorkshops } from './getWorkshops';
export type { GetWorkshopsResult } from './getWorkshops';

export { createWorkshopRegistration } from './createRegistration';
export type {
  CreateRegistrationParams,
  CreateRegistrationResult,
} from './createRegistration';

export {
  getRegistrationsByUserId,
  getRegistrationsByWorkshopId,
  getRegistrationById,
} from './getRegistrations';
export type { GetRegistrationsResult } from './getRegistrations';
