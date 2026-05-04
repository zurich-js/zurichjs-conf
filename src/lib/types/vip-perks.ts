/**
 * VIP Perks Types
 * Types for VIP workshop discount code management
 */

/**
 * VIP perk record — one per VIP ticket
 */
export interface VipPerk {
  id: string;
  ticket_id: string;
  stripe_coupon_id: string;
  stripe_promotion_code_id?: string;
  code: string;
  discount_percent: number;
  restricted_product_ids: string[];
  max_redemptions: number;
  current_redemptions: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * VIP perk with joined ticket information
 */
export interface VipPerkWithTicket extends VipPerk {
  ticket: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    ticket_category: string;
    status: string;
  };
}

/**
 * VIP perk email record
 */
export interface VipPerkEmail {
  id: string;
  vip_perk_id: string;
  ticket_id: string;
  recipient_email: string;
  recipient_name: string;
  subject: string;
  resend_message_id: string | null;
  custom_message: string | null;
  status: string;
  sent_at: string;
  created_at: string;
}

/**
 * VIP perk configuration (single-row)
 */
export interface VipPerkConfig {
  id: string;
  discount_percent: number;
  restricted_product_ids: string[];
  expires_at: string | null;
  auto_send_email: boolean;
  custom_email_message: string | null;
  updated_at: string;
}

/**
 * Request to create a VIP perk coupon for a ticket
 */
export interface CreateVipPerkRequest {
  ticket_id: string;
  restricted_product_ids: string[];
  discount_percent?: number;
  expires_at?: string;
}

/**
 * Request to send a VIP perk email
 */
export interface SendVipPerkEmailRequest {
  vip_perk_id: string;
  custom_message?: string;
}

/**
 * Request to run VIP perks backfill
 */
export interface BackfillVipPerksRequest {
  dry_run?: boolean;
  send_emails?: boolean;
  custom_message?: string;
}

/**
 * Backfill operation response
 */
export interface BackfillVipPerksResponse {
  total_vip_tickets: number;
  already_have_perk: number;
  created: number;
  failed: number;
  emails_sent: number;
  failures: Array<{ ticket_id: string; error: string }>;
}

/**
 * VIP perks stats for admin dashboard
 */
export interface VipPerksStats {
  total_vip_tickets: number;
  perks_created: number;
  perks_redeemed: number;
  emails_sent: number;
  pending: number;
}
