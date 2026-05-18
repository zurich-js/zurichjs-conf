/**
 * OSS Maintainer verification — barrel
 *
 * See individual files for implementation:
 *   - types.ts        Domain types + tier discount table
 *   - github.ts       GitHub API client
 *   - npm.ts          npm registry client
 *   - tier.ts         Pure tier-scoring function
 *   - verification.ts Pipeline that runs the full auto-check
 *   - coupons.ts      Idempotent Stripe coupon provisioning
 *   - seats.ts        Global OSS seat cap accounting
 *   - pricing.ts      Resolves current Stripe price for chosen tier
 */

export * from './types';
export { runOssVerification } from './verification';
export { scoreOssMaintainer, TIER_THRESHOLDS } from './tier';
export { parseRepoRef } from './github';
export { normalizeNpmName } from './npm';
export { ensureCouponForTier, couponIdForTier, createPromotionCodeForVerification } from './coupons';
export { getOssSeatInfo, OSS_MAINTAINER_SEAT_CAP } from './seats';
export { resolveOssTicketPrice } from './pricing';
