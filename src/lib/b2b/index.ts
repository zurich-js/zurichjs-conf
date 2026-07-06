/**
 * B2B Invoice Module
 * Re-exports all B2B invoice functionality
 */

// Invoice CRUD operations
export {
  createInvoice,
  getInvoice,
  getInvoiceWithAttendees,
  getWorkshopItems,
  listInvoices,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
  updateInvoicePDF,
  removeInvoicePDF,
} from './invoices';

// Invoice totals calculation
export { computeInvoiceTotals } from './invoice-calculations';

// Attendee management
export {
  addAttendees,
  getAttendees,
  getAttendee,
  updateAttendee,
  setAttendeeWorkshops,
  deleteAttendee,
  deleteAllAttendees,
  parseAttendeesFromCSV,
  validateAttendeeCount,
  validateWorkshopAssignments,
  type ParseCSVResult,
} from './attendees';

// Payment and ticket creation
export {
  markInvoiceAsPaidAndCreateTickets,
  getPaymentSummary,
} from './payment';
