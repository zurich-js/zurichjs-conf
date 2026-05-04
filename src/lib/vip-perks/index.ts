/**
 * VIP Perks Module
 * Workshop discount code management for VIP ticket holders
 */

export {
  createVipPerkCoupon,
  getVipPerkConfig,
  updateVipPerkConfig,
  listVipPerks,
  getVipPerkByTicketId,
  deactivateVipPerk,
  syncPerkRedemptions,
} from './coupons';

export {
  sendVipPerkEmail,
  getVipPerkEmailHistory,
} from './email';

export {
  backfillVipPerks,
} from './backfill';
