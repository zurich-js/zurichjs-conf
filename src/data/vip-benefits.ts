/**
 * VIP Benefits
 * Structured content for the VIP ticket benefits, displayed on the
 * manage-order page (benefits card, pending upgrade preview, upgrade CTA).
 *
 * Note: `VIP_PERKS` in `@/lib/types/ticket-upgrade` is the legacy flat string
 * list still used by emails and checkout copy. This structured version is the
 * source of truth for the manage-order UI.
 */

export type VipBenefitId = 'workshop-discount' | 'afterparty' | 'goodies';

export interface VipBenefit {
  id: VipBenefitId;
  title: string;
  description: string;
}

export const VIP_BENEFITS: readonly VipBenefit[] = [
  {
    id: 'workshop-discount',
    title: '20% off all workshops',
    description: 'A personal one-time voucher, valid for any workshop of your choice.',
  },
  {
    id: 'afterparty',
    title: 'Afterparty access',
    description: 'Wind down with speakers and fellow attendees after the conference — food and drinks included.',
  },
  {
    id: 'goodies',
    title: 'Limited edition goodies',
    description: 'An exclusive VIP swag package, including a conference hoodie in your size.',
  },
] as const;
