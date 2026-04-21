/**
 * Database Types
 * TypeScript types matching the Supabase database schema
 */

// Export the generated database types from Supabase
export type { Database, Json } from './database.generated';

export type UserRole = 'attendee' | 'speaker' | 'admin';

/**
 * Ticket Category - The type of ticket (pricing tier)
 */
export type TicketCategory = 'standard' | 'student' | 'unemployed' | 'vip';

/**
 * Ticket Stage - When the ticket was purchased (pricing period)
 */
export type TicketStage = 'blind_bird' | 'early_bird' | 'general_admission' | 'late_bird';

/**
 * Legacy type for backward compatibility
 * @deprecated Use TicketCategory and TicketStage instead
 */
export type TicketType =
  | 'blind_bird'
  | 'early_bird'
  | 'standard'
  | 'student'
  | 'unemployed'
  | 'late_bird'
  | 'vip';

export type PaymentStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded';

export type WorkshopStatus = 'draft' | 'published' | 'cancelled' | 'completed' | 'archived';

/**
 * Database Tables
 */

export interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  phone: string | null;
  stripe_customer_id: string | null;
  role: UserRole;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  user_id: string | null; // Nullable for guest purchases
  ticket_type: TicketType; // Legacy field - kept for backward compatibility
  ticket_category: TicketCategory; // NEW: Type of ticket (standard, student, vip, etc)
  ticket_stage: TicketStage; // NEW: Purchase stage (blind_bird, early_bird, etc)
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  job_title: string | null; // NEW: Job title/role of the attendee
  stripe_customer_id: string;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  amount_paid: number; // in cents
  currency: string;
  status: PaymentStatus;
  checked_in: boolean | null; // Whether the ticket has been checked in at the venue
  checked_in_at: string | null; // When the ticket was checked in
  qr_code_url: string | null; // Public URL to stored QR code image
  transferred_from_name: string | null; // Name of original owner if ticket was transferred
  transferred_from_email: string | null; // Email of original owner if ticket was transferred
  transferred_at: string | null; // When the ticket was transferred
  // Partnership tracking fields
  coupon_code: string | null; // The coupon/voucher code applied at checkout
  partnership_coupon_id: string | null; // Reference to partnership_coupons table
  partnership_voucher_id: string | null; // Reference to partnership_vouchers table
  partnership_id: string | null; // Reference to partnerships table
  discount_amount: number; // Discount amount in cents
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Workshop {
  id: string;
  title: string;
  description: string;
  instructor_id: string | null;
  cfp_submission_id: string | null;
  room: string | null;
  duration_minutes: number | null;
  stripe_product_id: string | null;
  stripe_price_lookup_key: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  capacity: number;
  enrolled_count: number;
  price: number | null; // in cents; legacy, not written by new commerce flow
  currency: string;
  status: WorkshopStatus;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkshopRegistration {
  id: string;
  workshop_id: string;
  user_id: string | null;
  ticket_id: string | null;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  amount_paid: number; // in cents
  currency: string;
  status: PaymentStatus;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  coupon_code: string | null;
  partnership_coupon_id: string | null;
  partnership_voucher_id: string | null;
  discount_amount: number; // in cents
  seat_index: number; // 0-based within a multi-seat purchase (session + workshop scope)
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Database schema types are now generated from Supabase
// See database.generated.ts for the full schema definition
