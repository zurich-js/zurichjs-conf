/**
 * Base Analytics Event Types
 * Shared property interfaces used across all events
 */

import type { TicketCategory, TicketStage } from '@/lib/types/database';

/**
 * Base properties included in all events
 */
export interface BaseEventProperties {
  timestamp?: number;
  page_url?: string;
  page_title?: string;
  user_agent?: string;
  referrer?: string;
}

/**
 * User identification properties
 */
export interface UserProperties {
  email?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  job_title?: string;
  user_id?: string;
}

/**
 * Ticket-related properties
 */
export interface TicketProperties {
  ticket_id?: string;
  ticket_category: TicketCategory;
  ticket_stage: TicketStage;
  ticket_price: number;
  currency: string;
  ticket_count: number;
}

/**
 * Workshop-related properties
 */
export interface WorkshopProperties {
  workshop_id: string;
  workshop_title: string;
  workshop_instructor?: string;
  workshop_capacity?: number;
  workshop_date?: string;
}

/**
 * Payment-related properties
 */
export interface PaymentProperties {
  payment_intent_id?: string;
  payment_method?: string;
  payment_status: 'succeeded' | 'failed' | 'pending' | 'cancelled';
  stripe_session_id?: string;
  stripe_customer_id?: string;
}

/**
 * Revenue properties (for revenue analytics)
 */
export interface RevenueProperties {
  /** Total amount in smallest currency unit (e.g., cents) */
  revenue_amount: number;
  /** ISO 4217 currency code */
  revenue_currency: string;
  /** Revenue type for categorization */
  revenue_type: 'ticket' | 'workshop' | 'voucher' | 'other';
  /** Optional transaction ID */
  transaction_id?: string;
  /** Optional product details */
  product_name?: string;
  product_category?: string;
}

/**
 * Cart-related properties
 */
export interface CartProperties {
  cart_item_count: number;
  cart_total_amount: number;
  cart_currency: string;
  cart_items: Array<{
    type: 'ticket' | 'workshop_voucher';
    category?: TicketCategory;
    stage?: TicketStage;
    quantity: number;
    price: number;
  }>;
}

/**
 * Error properties
 */
export interface ErrorProperties {
  error_message: string;
  error_code?: string;
  error_stack?: string;
  error_type: 'validation' | 'network' | 'payment' | 'auth' | 'system' | 'unknown';
  error_severity: 'low' | 'medium' | 'high' | 'critical';
  error_context?: Record<string, unknown>;
}

/**
 * Page view event
 */
export interface PageViewedEvent {
  event: 'page_viewed';
  properties: BaseEventProperties & {
    page_name: string;
    page_path: string;
    page_category?: 'landing' | 'tickets' | 'workshops' | 'checkout' | 'admin' | 'other';
  };
}

/**
 * User identification event
 */
export interface UserIdentifiedEvent {
  event: 'user_identified';
  properties: BaseEventProperties & UserProperties;
}
