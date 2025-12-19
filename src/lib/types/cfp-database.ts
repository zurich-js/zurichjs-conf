/**
 * CFP Database Schema Types
 * TypeScript types for Supabase client operations on CFP tables
 *
 * This provides proper typing for the CFP tables until they are
 * included in the auto-generated database types.
 */

import type {
  CfpSubmissionType,
  CfpTalkLevel,
  CfpSubmissionStatus,
  CfpReviewerRole,
  CfpFlightDirection,
  CfpFlightStatus,
  CfpReimbursementStatus,
  CfpReimbursementType,
} from './cfp';

/**
 * Database row types for CFP tables
 */
export interface CfpDatabaseSchema {
  public: {
    Tables: {
      cfp_speakers: {
        Row: {
          id: string;
          user_id: string | null;
          email: string;
          first_name: string;
          last_name: string;
          job_title: string | null;
          company: string | null;
          bio: string | null;
          linkedin_url: string | null;
          github_url: string | null;
          twitter_handle: string | null;
          bluesky_handle: string | null;
          mastodon_handle: string | null;
          profile_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email: string;
          first_name: string;
          last_name: string;
          job_title?: string | null;
          company?: string | null;
          bio?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          twitter_handle?: string | null;
          bluesky_handle?: string | null;
          mastodon_handle?: string | null;
          profile_image_url?: string | null;
        };
        Update: Partial<CfpDatabaseSchema['public']['Tables']['cfp_speakers']['Insert']>;
      };
      cfp_submissions: {
        Row: {
          id: string;
          speaker_id: string;
          title: string;
          abstract: string;
          submission_type: CfpSubmissionType;
          talk_level: CfpTalkLevel;
          additional_notes: string | null;
          outline: string | null;
          slides_url: string | null;
          previous_recording_url: string | null;
          travel_assistance_required: boolean;
          travel_origin: string | null;
          company_can_cover_travel: boolean;
          special_requirements: string | null;
          workshop_duration_hours: number | null;
          workshop_expected_compensation: string | null;
          workshop_compensation_amount: number | null;
          workshop_special_requirements: string | null;
          workshop_max_participants: number | null;
          status: CfpSubmissionStatus;
          submitted_at: string | null;
          withdrawn_at: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          speaker_id: string;
          title: string;
          abstract: string;
          submission_type: CfpSubmissionType;
          talk_level: CfpTalkLevel;
          additional_notes?: string | null;
          outline?: string | null;
          slides_url?: string | null;
          previous_recording_url?: string | null;
          travel_assistance_required?: boolean;
          travel_origin?: string | null;
          company_can_cover_travel?: boolean;
          special_requirements?: string | null;
          workshop_duration_hours?: number | null;
          workshop_expected_compensation?: string | null;
          workshop_compensation_amount?: number | null;
          workshop_special_requirements?: string | null;
          workshop_max_participants?: number | null;
          status?: CfpSubmissionStatus;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<CfpDatabaseSchema['public']['Tables']['cfp_submissions']['Insert']>;
      };
      cfp_tags: {
        Row: {
          id: string;
          name: string;
          is_suggested: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          is_suggested?: boolean;
        };
        Update: Partial<CfpDatabaseSchema['public']['Tables']['cfp_tags']['Insert']>;
      };
      cfp_submission_tags: {
        Row: {
          submission_id: string;
          tag_id: string;
        };
        Insert: {
          submission_id: string;
          tag_id: string;
        };
        Update: Partial<CfpDatabaseSchema['public']['Tables']['cfp_submission_tags']['Insert']>;
      };
      cfp_reviewers: {
        Row: {
          id: string;
          user_id: string | null;
          email: string;
          name: string | null;
          role: CfpReviewerRole;
          can_see_speaker_identity: boolean;
          invited_by: string | null;
          invited_at: string;
          accepted_at: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email: string;
          name?: string | null;
          role?: CfpReviewerRole;
          can_see_speaker_identity?: boolean;
          invited_by?: string | null;
          is_active?: boolean;
        };
        Update: Partial<CfpDatabaseSchema['public']['Tables']['cfp_reviewers']['Insert']>;
      };
      cfp_reviews: {
        Row: {
          id: string;
          submission_id: string;
          reviewer_id: string;
          score_overall: number | null;
          score_relevance: number | null;
          score_technical_depth: number | null;
          score_clarity: number | null;
          score_diversity: number | null;
          private_notes: string | null;
          feedback_to_speaker: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          submission_id: string;
          reviewer_id: string;
          score_overall?: number | null;
          score_relevance?: number | null;
          score_technical_depth?: number | null;
          score_clarity?: number | null;
          score_diversity?: number | null;
          private_notes?: string | null;
          feedback_to_speaker?: string | null;
        };
        Update: Partial<CfpDatabaseSchema['public']['Tables']['cfp_reviews']['Insert']>;
      };
      cfp_speaker_travel: {
        Row: {
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
        };
        Insert: {
          id?: string;
          speaker_id: string;
          arrival_date?: string | null;
          departure_date?: string | null;
          attending_speakers_dinner?: boolean | null;
          attending_speakers_activities?: boolean | null;
          dietary_restrictions?: string | null;
          accessibility_needs?: string | null;
          flight_budget_amount?: number | null;
          flight_budget_currency?: string;
          travel_confirmed?: boolean;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<CfpDatabaseSchema['public']['Tables']['cfp_speaker_travel']['Insert']>;
      };
      cfp_speaker_flights: {
        Row: {
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
        };
        Insert: {
          id?: string;
          speaker_id: string;
          direction: CfpFlightDirection;
          airline?: string | null;
          flight_number?: string | null;
          departure_airport?: string | null;
          arrival_airport?: string | null;
          departure_time?: string | null;
          arrival_time?: string | null;
          booking_reference?: string | null;
          flight_status?: CfpFlightStatus;
          tracking_url?: string | null;
          cost_amount?: number | null;
          cost_currency?: string;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<CfpDatabaseSchema['public']['Tables']['cfp_speaker_flights']['Insert']>;
      };
      cfp_speaker_accommodation: {
        Row: {
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
        };
        Insert: {
          id?: string;
          speaker_id: string;
          hotel_name?: string | null;
          hotel_address?: string | null;
          check_in_date?: string | null;
          check_out_date?: string | null;
          reservation_number?: string | null;
          reservation_confirmation_url?: string | null;
          cost_amount?: number | null;
          cost_currency?: string;
          is_covered_by_conference?: boolean;
          admin_notes?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<CfpDatabaseSchema['public']['Tables']['cfp_speaker_accommodation']['Insert']>;
      };
      cfp_speaker_reimbursements: {
        Row: {
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
        };
        Insert: {
          id?: string;
          speaker_id: string;
          expense_type: CfpReimbursementType;
          description: string;
          amount: number;
          currency?: string;
          receipt_url?: string | null;
          bank_name?: string | null;
          bank_account_holder?: string | null;
          iban?: string | null;
          swift_bic?: string | null;
          status?: CfpReimbursementStatus;
          admin_notes?: string | null;
          metadata?: Record<string, unknown>;
        };
        Update: Partial<CfpDatabaseSchema['public']['Tables']['cfp_speaker_reimbursements']['Insert']>;
      };
      cfp_config: {
        Row: {
          id: string;
          key: string;
          value: Record<string, unknown>;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value: Record<string, unknown>;
        };
        Update: Partial<CfpDatabaseSchema['public']['Tables']['cfp_config']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      cfp_submission_type: CfpSubmissionType;
      cfp_talk_level: CfpTalkLevel;
      cfp_submission_status: CfpSubmissionStatus;
      cfp_reviewer_role: CfpReviewerRole;
      cfp_flight_direction: CfpFlightDirection;
      cfp_flight_status: CfpFlightStatus;
      cfp_reimbursement_status: CfpReimbursementStatus;
      cfp_reimbursement_type: CfpReimbursementType;
    };
  };
}
