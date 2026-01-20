/**
 * Sponsorship Module
 * Re-exports all sponsorship functionality
 */

// Tier operations
export { listTiers, getTier } from './tiers';

// Sponsor CRUD operations
export {
  createSponsor,
  getSponsor,
  updateSponsor,
  updateSponsorLogo,
  toggleLogoPublic,
  listSponsors,
  deleteSponsor,
  getPublicSponsors,
} from './sponsors';

// Deal CRUD operations
export {
  createDeal,
  getDeal,
  getDealWithRelations,
  updateDeal,
  updateDealStatus,
  listDeals,
  deleteDeal,
} from './deals';

// Line Item operations
export {
  addLineItem,
  updateLineItem,
  removeLineItem,
  getLineItemsForDeal,
  initializeTierBaseLineItem,
} from './line-items';

// Perk operations
export {
  initializePerksForDeal,
  updatePerk,
  getPerksForDeal,
  addPerk,
  removePerk,
} from './perks';

// Invoice operations
export {
  createInvoice,
  getInvoice,
  getInvoiceForDeal,
  updateInvoicePDF,
  removeInvoicePDF,
  updateInvoiceConversion,
} from './invoices';

// Calculation utilities
export {
  computeSponsorshipInvoiceTotals,
  formatCurrency,
} from './calculations';

// Stats
export { getSponsorshipStats } from './stats';
