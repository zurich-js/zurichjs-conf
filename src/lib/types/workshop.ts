/**
 * Workshop Types
 * Extended types for the workshop system (Zurich Engineering Day)
 */

// ─── Enums & Constants ───────────────────────────────────────────────────────

export type WorkshopStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export type WorkshopLevel = 'beginner' | 'intermediate' | 'advanced';

export type WorkshopTimeSlot = 'morning' | 'afternoon' | 'full_day';

export type WorkshopBookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded';

export const WORKSHOP_LEVELS: WorkshopLevel[] = ['beginner', 'intermediate', 'advanced'];

export const WORKSHOP_TIME_SLOTS: WorkshopTimeSlot[] = ['morning', 'afternoon', 'full_day'];

export const WORKSHOP_STATUSES: WorkshopStatus[] = ['draft', 'published', 'cancelled', 'completed'];

export const WORKSHOP_LEVEL_LABELS: Record<WorkshopLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const WORKSHOP_TIME_SLOT_LABELS: Record<WorkshopTimeSlot, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  full_day: 'Full Day',
};

/** Workshop date: September 10, 2026 (Warm-up day) */
export const WORKSHOP_DAY_DATE = '2026-09-10';

/** Combo discount percentage when buying ticket + workshop together */
export const COMBO_DISCOUNT_PERCENT = 10;

// ─── Workshop Entity ─────────────────────────────────────────────────────────

export interface WorkshopDetail {
  id: string;
  slug: string;
  title: string;
  short_abstract: string;
  long_abstract: string;
  status: WorkshopStatus;
  featured: boolean;

  // Scheduling
  date: string;
  time_slot: WorkshopTimeSlot;
  start_time: string;
  end_time: string;
  duration_minutes: number;

  // Classification
  level: WorkshopLevel;
  topic_tags: string[];

  // Content
  outcomes: string[];
  prerequisites: string[];
  agenda: string[];

  // Capacity & Pricing
  capacity: number;
  enrolled_count: number;
  price: number; // in cents
  currency: string;

  // Location
  location: string;
  room: string | null;

  // Instructor (references cfp_speakers)
  instructor_id: string | null;
  instructor_name: string | null;
  instructor_avatar_url: string | null;
  instructor_bio: string | null;
  instructor_company: string | null;
  instructor_job_title: string | null;
  instructor_linkedin_url: string | null;
  instructor_github_url: string | null;
  instructor_twitter_handle: string | null;

  // Stripe
  stripe_product_id: string | null;
  stripe_price_id: string | null;

  // Metadata
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Workshop Booking ────────────────────────────────────────────────────────

export interface WorkshopBooking {
  id: string;
  workshop_id: string;
  user_id: string | null;
  ticket_id: string | null;

  // Attendee info
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;

  // Payment
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_paid: number; // in cents
  currency: string;
  status: WorkshopBookingStatus;

  // Discount tracking
  coupon_code: string | null;
  discount_amount: number;
  is_combo_purchase: boolean;

  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Public View Types ───────────────────────────────────────────────────────

export interface PublicWorkshop {
  id: string;
  slug: string;
  title: string;
  short_abstract: string;
  long_abstract: string;
  featured: boolean;

  date: string;
  time_slot: WorkshopTimeSlot;
  start_time: string;
  end_time: string;
  duration_minutes: number;

  level: WorkshopLevel;
  topic_tags: string[];

  outcomes: string[];
  prerequisites: string[];
  agenda: string[];

  capacity: number;
  seats_remaining: number;
  is_sold_out: boolean;

  price: number;
  currency: string;

  location: string;
  room: string | null;

  instructor: WorkshopInstructor | null;
}

export interface WorkshopInstructor {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  company: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  twitter_handle: string | null;
}

// ─── Admin Types ─────────────────────────────────────────────────────────────

export interface AdminWorkshop extends WorkshopDetail {
  bookings_count: number;
  revenue: number;
}

export interface WorkshopBookingWithDetails extends WorkshopBooking {
  workshop_title: string;
  workshop_time_slot: WorkshopTimeSlot;
}

export interface WorkshopFilters {
  status?: WorkshopStatus;
  time_slot?: WorkshopTimeSlot;
  level?: WorkshopLevel;
  search?: string;
}

export interface BookingFilters {
  workshop_id?: string;
  time_slot?: WorkshopTimeSlot;
  status?: WorkshopBookingStatus;
  search?: string;
}

// ─── API Request/Response Types ──────────────────────────────────────────────

export interface CreateWorkshopRequest {
  title: string;
  slug: string;
  short_abstract: string;
  long_abstract: string;
  status?: WorkshopStatus;
  featured?: boolean;
  date: string;
  time_slot: WorkshopTimeSlot;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  level: WorkshopLevel;
  topic_tags: string[];
  outcomes: string[];
  prerequisites: string[];
  agenda?: string[];
  capacity: number;
  price: number;
  currency: string;
  location: string;
  room?: string;
  instructor_id?: string;
}

export interface UpdateWorkshopRequest extends Partial<CreateWorkshopRequest> {
  id: string;
}

export interface BookWorkshopRequest {
  workshop_id: string;
  /** If user already has a ticket, pass the ticket email to verify */
  ticket_email?: string;
  /** Customer info for checkout */
  customer_info?: {
    first_name: string;
    last_name: string;
    email: string;
    company?: string;
  };
}

export interface WorkshopCheckoutRequest {
  workshop_ids: string[];
  include_conference_ticket?: boolean;
  ticket_price_id?: string;
  customer_info: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    company?: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
  };
  coupon_code?: string;
}
