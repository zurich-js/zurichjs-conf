/**
 * Admin verifications — shared types
 */

import type { FollowUpStatus, VerificationTicketMatch } from '@/lib/verifications';

export interface VerificationRequest {
  id: string;
  verification_id: string;
  name: string;
  email: string;
  verification_type: 'student' | 'unemployed';
  student_id: string | null;
  university: string | null;
  linkedin_url: string | null;
  rav_registration_date: string | null;
  additional_info: string | null;
  price_id: string;
  country_code: string | null;
  currency: string | null;
  status: 'pending' | 'approved' | 'rejected';
  stripe_payment_link_id: string | null;
  stripe_payment_link_url: string | null;
  stripe_session_id: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface VerificationWithTicket extends VerificationRequest {
  ticket_match: VerificationTicketMatch;
  follow_up_status: FollowUpStatus;
}
