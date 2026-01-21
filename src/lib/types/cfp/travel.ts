/**
 * CFP Travel Types
 * Travel, flight, accommodation, and reimbursement types
 */

import type {
  CfpFlightDirection,
  CfpFlightStatus,
  CfpReimbursementType,
  CfpReimbursementStatus,
} from './base';

/**
 * Speaker travel logistics
 */
export interface CfpSpeakerTravel {
  id: string;
  speaker_id: string;
  arrival_date: string | null;
  departure_date: string | null;
  attending_speakers_dinner: boolean | null;
  attending_speakers_activities: boolean | null;
  dietary_restrictions: string | null;
  accessibility_needs: string | null;
  flight_budget_amount: number | null;
  flight_budget_currency: string;
  travel_confirmed: boolean;
  confirmed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Speaker flight details
 */
export interface CfpSpeakerFlight {
  id: string;
  speaker_id: string;
  direction: CfpFlightDirection;
  airline: string | null;
  flight_number: string | null;
  departure_airport: string | null;
  arrival_airport: string | null;
  departure_time: string | null;
  arrival_time: string | null;
  booking_reference: string | null;
  flight_status: CfpFlightStatus;
  tracking_url: string | null;
  last_status_update: string | null;
  cost_amount: number | null;
  cost_currency: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Speaker accommodation details
 */
export interface CfpSpeakerAccommodation {
  id: string;
  speaker_id: string;
  hotel_name: string | null;
  hotel_address: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  reservation_number: string | null;
  reservation_confirmation_url: string | null;
  cost_amount: number | null;
  cost_currency: string;
  is_covered_by_conference: boolean;
  admin_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Speaker expense reimbursement
 */
export interface CfpSpeakerReimbursement {
  id: string;
  speaker_id: string;
  expense_type: CfpReimbursementType;
  description: string;
  amount: number;
  currency: string;
  receipt_url: string | null;
  bank_name: string | null;
  bank_account_holder: string | null;
  iban: string | null;
  swift_bic: string | null;
  status: CfpReimbursementStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  paid_at: string | null;
  admin_notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
