export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      b2b_invoice_attendees: {
        Row: {
          company: string | null
          created_at: string
          email: string
          email_sent: boolean | null
          email_sent_at: string | null
          first_name: string
          id: string
          invoice_id: string
          job_title: string | null
          last_name: string
          ticket_id: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          first_name: string
          id?: string
          invoice_id: string
          job_title?: string | null
          last_name: string
          ticket_id?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          first_name?: string
          id?: string
          invoice_id?: string
          job_title?: string | null
          last_name?: string
          ticket_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_invoice_attendees_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "b2b_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_invoice_attendees_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_invoices: {
        Row: {
          bank_transfer_reference: string | null
          billing_address_city: string
          billing_address_country: string
          billing_address_postal_code: string
          billing_address_street: string
          company_name: string
          contact_email: string
          contact_name: string
          created_at: string
          currency: string
          due_date: string
          id: string
          invoice_notes: string | null
          invoice_number: string
          invoice_pdf_source: string | null
          invoice_pdf_uploaded_at: string | null
          invoice_pdf_url: string | null
          issue_date: string
          metadata: Json | null
          notes: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["b2b_invoice_status"]
          stripe_payment_link_id: string | null
          stripe_payment_link_url: string | null
          subtotal: number
          ticket_category: string
          ticket_quantity: number
          ticket_stage: string
          total_amount: number
          unit_price: number
          updated_at: string
          vat_amount: number
          vat_id: string | null
          vat_rate: number
        }
        Insert: {
          bank_transfer_reference?: string | null
          billing_address_city: string
          billing_address_country?: string
          billing_address_postal_code: string
          billing_address_street: string
          company_name: string
          contact_email: string
          contact_name: string
          created_at?: string
          currency?: string
          due_date: string
          id?: string
          invoice_notes?: string | null
          invoice_number: string
          invoice_pdf_source?: string | null
          invoice_pdf_uploaded_at?: string | null
          invoice_pdf_url?: string | null
          issue_date?: string
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["b2b_invoice_status"]
          stripe_payment_link_id?: string | null
          stripe_payment_link_url?: string | null
          subtotal: number
          ticket_category: string
          ticket_quantity: number
          ticket_stage: string
          total_amount: number
          unit_price: number
          updated_at?: string
          vat_amount?: number
          vat_id?: string | null
          vat_rate?: number
        }
        Update: {
          bank_transfer_reference?: string | null
          billing_address_city?: string
          billing_address_country?: string
          billing_address_postal_code?: string
          billing_address_street?: string
          company_name?: string
          contact_email?: string
          contact_name?: string
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          invoice_notes?: string | null
          invoice_number?: string
          invoice_pdf_source?: string | null
          invoice_pdf_uploaded_at?: string | null
          invoice_pdf_url?: string | null
          issue_date?: string
          metadata?: Json | null
          notes?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["b2b_invoice_status"]
          stripe_payment_link_id?: string | null
          stripe_payment_link_url?: string | null
          subtotal?: number
          ticket_category?: string
          ticket_quantity?: number
          ticket_stage?: string
          total_amount?: number
          unit_price?: number
          updated_at?: string
          vat_amount?: number
          vat_id?: string | null
          vat_rate?: number
        }
        Relationships: []
      }
      cfp_config: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      cfp_reviewers: {
        Row: {
          accepted_at: string | null
          can_see_speaker_identity: boolean | null
          created_at: string
          email: string
          id: string
          invited_at: string
          invited_by: string | null
          is_active: boolean | null
          name: string | null
          role: Database["public"]["Enums"]["cfp_reviewer_role"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          can_see_speaker_identity?: boolean | null
          created_at?: string
          email: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_active?: boolean | null
          name?: string | null
          role?: Database["public"]["Enums"]["cfp_reviewer_role"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          can_see_speaker_identity?: boolean | null
          created_at?: string
          email?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          is_active?: boolean | null
          name?: string | null
          role?: Database["public"]["Enums"]["cfp_reviewer_role"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cfp_reviewers_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "cfp_reviewers"
            referencedColumns: ["id"]
          },
        ]
      }
      cfp_reviews: {
        Row: {
          created_at: string
          feedback_to_speaker: string | null
          id: string
          private_notes: string | null
          reviewer_id: string
          score_clarity: number | null
          score_diversity: number | null
          score_overall: number | null
          score_relevance: number | null
          score_technical_depth: number | null
          submission_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feedback_to_speaker?: string | null
          id?: string
          private_notes?: string | null
          reviewer_id: string
          score_clarity?: number | null
          score_diversity?: number | null
          score_overall?: number | null
          score_relevance?: number | null
          score_technical_depth?: number | null
          submission_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feedback_to_speaker?: string | null
          id?: string
          private_notes?: string | null
          reviewer_id?: string
          score_clarity?: number | null
          score_diversity?: number | null
          score_overall?: number | null
          score_relevance?: number | null
          score_technical_depth?: number | null
          submission_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfp_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "cfp_reviewers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfp_reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "cfp_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      cfp_speaker_accommodation: {
        Row: {
          admin_notes: string | null
          check_in_date: string | null
          check_out_date: string | null
          cost_amount: number | null
          cost_currency: string | null
          created_at: string
          hotel_address: string | null
          hotel_name: string | null
          id: string
          is_covered_by_conference: boolean | null
          metadata: Json | null
          reservation_confirmation_url: string | null
          reservation_number: string | null
          speaker_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          check_in_date?: string | null
          check_out_date?: string | null
          cost_amount?: number | null
          cost_currency?: string | null
          created_at?: string
          hotel_address?: string | null
          hotel_name?: string | null
          id?: string
          is_covered_by_conference?: boolean | null
          metadata?: Json | null
          reservation_confirmation_url?: string | null
          reservation_number?: string | null
          speaker_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          check_in_date?: string | null
          check_out_date?: string | null
          cost_amount?: number | null
          cost_currency?: string | null
          created_at?: string
          hotel_address?: string | null
          hotel_name?: string | null
          id?: string
          is_covered_by_conference?: boolean | null
          metadata?: Json | null
          reservation_confirmation_url?: string | null
          reservation_number?: string | null
          speaker_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfp_speaker_accommodation_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "cfp_speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      cfp_speaker_flights: {
        Row: {
          airline: string | null
          arrival_airport: string | null
          arrival_time: string | null
          booking_reference: string | null
          cost_amount: number | null
          cost_currency: string | null
          created_at: string
          departure_airport: string | null
          departure_time: string | null
          direction: Database["public"]["Enums"]["cfp_flight_direction"]
          flight_number: string | null
          flight_status: Database["public"]["Enums"]["cfp_flight_status"] | null
          id: string
          last_status_update: string | null
          metadata: Json | null
          speaker_id: string
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          airline?: string | null
          arrival_airport?: string | null
          arrival_time?: string | null
          booking_reference?: string | null
          cost_amount?: number | null
          cost_currency?: string | null
          created_at?: string
          departure_airport?: string | null
          departure_time?: string | null
          direction: Database["public"]["Enums"]["cfp_flight_direction"]
          flight_number?: string | null
          flight_status?:
            | Database["public"]["Enums"]["cfp_flight_status"]
            | null
          id?: string
          last_status_update?: string | null
          metadata?: Json | null
          speaker_id: string
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          airline?: string | null
          arrival_airport?: string | null
          arrival_time?: string | null
          booking_reference?: string | null
          cost_amount?: number | null
          cost_currency?: string | null
          created_at?: string
          departure_airport?: string | null
          departure_time?: string | null
          direction?: Database["public"]["Enums"]["cfp_flight_direction"]
          flight_number?: string | null
          flight_status?:
            | Database["public"]["Enums"]["cfp_flight_status"]
            | null
          id?: string
          last_status_update?: string | null
          metadata?: Json | null
          speaker_id?: string
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfp_speaker_flights_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "cfp_speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      cfp_speaker_reimbursements: {
        Row: {
          admin_notes: string | null
          amount: number
          bank_account_holder: string | null
          bank_name: string | null
          created_at: string
          currency: string | null
          description: string
          expense_type: Database["public"]["Enums"]["cfp_reimbursement_type"]
          iban: string | null
          id: string
          metadata: Json | null
          paid_at: string | null
          receipt_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          speaker_id: string
          status: Database["public"]["Enums"]["cfp_reimbursement_status"]
          swift_bic: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          bank_account_holder?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string | null
          description: string
          expense_type: Database["public"]["Enums"]["cfp_reimbursement_type"]
          iban?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          speaker_id: string
          status?: Database["public"]["Enums"]["cfp_reimbursement_status"]
          swift_bic?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          bank_account_holder?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string | null
          description?: string
          expense_type?: Database["public"]["Enums"]["cfp_reimbursement_type"]
          iban?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          receipt_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          speaker_id?: string
          status?: Database["public"]["Enums"]["cfp_reimbursement_status"]
          swift_bic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfp_speaker_reimbursements_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "cfp_reviewers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfp_speaker_reimbursements_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "cfp_speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      cfp_speaker_travel: {
        Row: {
          accessibility_needs: string | null
          arrival_date: string | null
          attending_speakers_activities: boolean | null
          attending_speakers_dinner: boolean | null
          confirmed_at: string | null
          created_at: string
          departure_date: string | null
          dietary_restrictions: string | null
          flight_budget_amount: number | null
          flight_budget_currency: string | null
          id: string
          metadata: Json | null
          speaker_id: string
          travel_confirmed: boolean | null
          updated_at: string
        }
        Insert: {
          accessibility_needs?: string | null
          arrival_date?: string | null
          attending_speakers_activities?: boolean | null
          attending_speakers_dinner?: boolean | null
          confirmed_at?: string | null
          created_at?: string
          departure_date?: string | null
          dietary_restrictions?: string | null
          flight_budget_amount?: number | null
          flight_budget_currency?: string | null
          id?: string
          metadata?: Json | null
          speaker_id: string
          travel_confirmed?: boolean | null
          updated_at?: string
        }
        Update: {
          accessibility_needs?: string | null
          arrival_date?: string | null
          attending_speakers_activities?: boolean | null
          attending_speakers_dinner?: boolean | null
          confirmed_at?: string | null
          created_at?: string
          departure_date?: string | null
          dietary_restrictions?: string | null
          flight_budget_amount?: number | null
          flight_budget_currency?: string | null
          id?: string
          metadata?: Json | null
          speaker_id?: string
          travel_confirmed?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfp_speaker_travel_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: true
            referencedRelation: "cfp_speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      cfp_speakers: {
        Row: {
          assistance_type: string | null
          bio: string | null
          bluesky_handle: string | null
          city: string | null
          company: string | null
          company_interested_in_sponsoring: boolean | null
          country: string | null
          created_at: string
          departure_airport: string | null
          email: string
          first_name: string
          github_url: string | null
          id: string
          is_featured: boolean
          is_visible: boolean
          job_title: string | null
          last_name: string
          linkedin_url: string | null
          mastodon_handle: string | null
          profile_image_url: string | null
          special_requirements: string | null
          travel_assistance_required: boolean | null
          tshirt_size: string | null
          twitter_handle: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assistance_type?: string | null
          bio?: string | null
          bluesky_handle?: string | null
          city?: string | null
          company?: string | null
          company_interested_in_sponsoring?: boolean | null
          country?: string | null
          created_at?: string
          departure_airport?: string | null
          email: string
          first_name: string
          github_url?: string | null
          id?: string
          is_featured?: boolean
          is_visible?: boolean
          job_title?: string | null
          last_name: string
          linkedin_url?: string | null
          mastodon_handle?: string | null
          profile_image_url?: string | null
          special_requirements?: string | null
          travel_assistance_required?: boolean | null
          tshirt_size?: string | null
          twitter_handle?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assistance_type?: string | null
          bio?: string | null
          bluesky_handle?: string | null
          city?: string | null
          company?: string | null
          company_interested_in_sponsoring?: boolean | null
          country?: string | null
          created_at?: string
          departure_airport?: string | null
          email?: string
          first_name?: string
          github_url?: string | null
          id?: string
          is_featured?: boolean
          is_visible?: boolean
          job_title?: string | null
          last_name?: string
          linkedin_url?: string | null
          mastodon_handle?: string | null
          profile_image_url?: string | null
          special_requirements?: string | null
          travel_assistance_required?: boolean | null
          tshirt_size?: string | null
          twitter_handle?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cfp_submission_tags: {
        Row: {
          submission_id: string
          tag_id: string
        }
        Insert: {
          submission_id: string
          tag_id: string
        }
        Update: {
          submission_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfp_submission_tags_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "cfp_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfp_submission_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "cfp_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      cfp_submissions: {
        Row: {
          abstract: string
          additional_notes: string | null
          company_can_cover_travel: boolean | null
          created_at: string
          id: string
          metadata: Json | null
          outline: string | null
          previous_recording_url: string | null
          room: string | null
          scheduled_date: string | null
          scheduled_duration_minutes: number | null
          scheduled_start_time: string | null
          slides_url: string | null
          speaker_id: string
          special_requirements: string | null
          status: Database["public"]["Enums"]["cfp_submission_status"]
          submission_type: Database["public"]["Enums"]["cfp_submission_type"]
          submitted_at: string | null
          talk_level: Database["public"]["Enums"]["cfp_talk_level"]
          title: string
          travel_assistance_required: boolean | null
          travel_origin: string | null
          updated_at: string
          withdrawn_at: string | null
          workshop_compensation_amount: number | null
          workshop_duration_hours: number | null
          workshop_expected_compensation: string | null
          workshop_max_participants: number | null
          workshop_special_requirements: string | null
        }
        Insert: {
          abstract: string
          additional_notes?: string | null
          company_can_cover_travel?: boolean | null
          created_at?: string
          id?: string
          metadata?: Json | null
          outline?: string | null
          previous_recording_url?: string | null
          room?: string | null
          scheduled_date?: string | null
          scheduled_duration_minutes?: number | null
          scheduled_start_time?: string | null
          slides_url?: string | null
          speaker_id: string
          special_requirements?: string | null
          status?: Database["public"]["Enums"]["cfp_submission_status"]
          submission_type: Database["public"]["Enums"]["cfp_submission_type"]
          submitted_at?: string | null
          talk_level: Database["public"]["Enums"]["cfp_talk_level"]
          title: string
          travel_assistance_required?: boolean | null
          travel_origin?: string | null
          updated_at?: string
          withdrawn_at?: string | null
          workshop_compensation_amount?: number | null
          workshop_duration_hours?: number | null
          workshop_expected_compensation?: string | null
          workshop_max_participants?: number | null
          workshop_special_requirements?: string | null
        }
        Update: {
          abstract?: string
          additional_notes?: string | null
          company_can_cover_travel?: boolean | null
          created_at?: string
          id?: string
          metadata?: Json | null
          outline?: string | null
          previous_recording_url?: string | null
          room?: string | null
          scheduled_date?: string | null
          scheduled_duration_minutes?: number | null
          scheduled_start_time?: string | null
          slides_url?: string | null
          speaker_id?: string
          special_requirements?: string | null
          status?: Database["public"]["Enums"]["cfp_submission_status"]
          submission_type?: Database["public"]["Enums"]["cfp_submission_type"]
          submitted_at?: string | null
          talk_level?: Database["public"]["Enums"]["cfp_talk_level"]
          title?: string
          travel_assistance_required?: boolean | null
          travel_origin?: string | null
          updated_at?: string
          withdrawn_at?: string | null
          workshop_compensation_amount?: number | null
          workshop_duration_hours?: number | null
          workshop_expected_compensation?: string | null
          workshop_max_participants?: number | null
          workshop_special_requirements?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cfp_submissions_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "cfp_speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      cfp_tags: {
        Row: {
          created_at: string
          id: string
          is_suggested: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_suggested?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_suggested?: boolean | null
          name?: string
        }
        Relationships: []
      }
      partnership_coupons: {
        Row: {
          code: string
          created_at: string
          currency: Database["public"]["Enums"]["voucher_currency"] | null
          current_redemptions: number
          discount_amount: number | null
          discount_percent: number | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_redemptions: number | null
          partnership_id: string
          restricted_product_ids: string[]
          stripe_coupon_id: string
          stripe_promotion_code_id: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency?: Database["public"]["Enums"]["voucher_currency"] | null
          current_redemptions?: number
          discount_amount?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          partnership_id: string
          restricted_product_ids?: string[]
          stripe_coupon_id: string
          stripe_promotion_code_id?: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["voucher_currency"] | null
          current_redemptions?: number
          discount_amount?: number | null
          discount_percent?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          partnership_id?: string
          restricted_product_ids?: string[]
          stripe_coupon_id?: string
          stripe_promotion_code_id?: string | null
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_coupons_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_emails: {
        Row: {
          created_at: string
          custom_message: string | null
          id: string
          included_banner: boolean
          included_coupons: boolean
          included_logo: boolean
          included_vouchers: boolean
          partnership_id: string
          recipient_email: string
          recipient_name: string
          resend_message_id: string | null
          sent_at: string
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          custom_message?: string | null
          id?: string
          included_banner?: boolean
          included_coupons?: boolean
          included_logo?: boolean
          included_vouchers?: boolean
          partnership_id: string
          recipient_email: string
          recipient_name: string
          resend_message_id?: string | null
          sent_at?: string
          status?: string
          subject: string
        }
        Update: {
          created_at?: string
          custom_message?: string | null
          id?: string
          included_banner?: boolean
          included_coupons?: boolean
          included_logo?: boolean
          included_vouchers?: boolean
          partnership_id?: string
          recipient_email?: string
          recipient_name?: string
          resend_message_id?: string | null
          sent_at?: string
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_emails_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_vouchers: {
        Row: {
          amount: number
          code: string
          created_at: string
          currency: Database["public"]["Enums"]["voucher_currency"]
          id: string
          is_redeemed: boolean
          partnership_id: string
          purpose: Database["public"]["Enums"]["voucher_purpose"]
          recipient_email: string | null
          recipient_name: string | null
          redeemed_at: string | null
          redeemed_by_email: string | null
          stripe_coupon_id: string
          stripe_promotion_code_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          code: string
          created_at?: string
          currency: Database["public"]["Enums"]["voucher_currency"]
          id?: string
          is_redeemed?: boolean
          partnership_id: string
          purpose: Database["public"]["Enums"]["voucher_purpose"]
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_at?: string | null
          redeemed_by_email?: string | null
          stripe_coupon_id: string
          stripe_promotion_code_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["voucher_currency"]
          id?: string
          is_redeemed?: boolean
          partnership_id?: string
          purpose?: Database["public"]["Enums"]["voucher_purpose"]
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_at?: string | null
          redeemed_by_email?: string | null
          stripe_coupon_id?: string
          stripe_promotion_code_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_vouchers_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      partnerships: {
        Row: {
          company_logo_url: string | null
          company_name: string | null
          company_website: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          id: string
          metadata: Json | null
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["partnership_status"]
          type: Database["public"]["Enums"]["partnership_type"]
          updated_at: string
          utm_campaign: string
          utm_medium: string
          utm_source: string
        }
        Insert: {
          company_logo_url?: string | null
          company_name?: string | null
          company_website?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["partnership_status"]
          type: Database["public"]["Enums"]["partnership_type"]
          updated_at?: string
          utm_campaign?: string
          utm_medium?: string
          utm_source: string
        }
        Update: {
          company_logo_url?: string | null
          company_name?: string | null
          company_website?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["partnership_status"]
          type?: Database["public"]["Enums"]["partnership_type"]
          updated_at?: string
          utm_campaign?: string
          utm_medium?: string
          utm_source?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          metadata: Json | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_abandonment_emails: {
        Row: {
          created_at: string | null
          email: string
          id: string
          resend_email_id: string
          scheduled_for: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          resend_email_id: string
          scheduled_for: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          resend_email_id?: string
          scheduled_for?: string
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          billing_address_city: string
          billing_address_country: string
          billing_address_postal_code: string
          billing_address_street: string
          company_name: string
          company_website: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          id: string
          internal_notes: string | null
          is_logo_public: boolean
          logo_url: string | null
          logo_url_color: string | null
          metadata: Json | null
          updated_at: string
          vat_id: string | null
        }
        Insert: {
          billing_address_city: string
          billing_address_country?: string
          billing_address_postal_code: string
          billing_address_street: string
          company_name: string
          company_website?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          internal_notes?: string | null
          is_logo_public?: boolean
          logo_url?: string | null
          logo_url_color: string | null
          metadata?: Json | null
          updated_at?: string
          vat_id?: string | null
        }
        Update: {
          billing_address_city?: string
          billing_address_country?: string
          billing_address_postal_code?: string
          billing_address_street?: string
          company_name?: string
          company_website?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          internal_notes?: string | null
          is_logo_public?: boolean
          logo_url?: string | null
          logo_url_color: string | null
          metadata?: Json | null
          updated_at?: string
          vat_id?: string | null
        }
        Relationships: []
      }
      sponsorship_deals: {
        Row: {
          created_at: string
          currency: string
          deal_number: string
          id: string
          internal_notes: string | null
          invoice_sent_at: string | null
          invoiced_at: string | null
          metadata: Json | null
          offer_sent_at: string | null
          paid_at: string | null
          paid_by: string | null
          sponsor_id: string
          status: Database["public"]["Enums"]["sponsorship_deal_status"]
          tier_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          deal_number: string
          id?: string
          internal_notes?: string | null
          invoice_sent_at?: string | null
          invoiced_at?: string | null
          metadata?: Json | null
          offer_sent_at?: string | null
          paid_at?: string | null
          paid_by?: string | null
          sponsor_id: string
          status?: Database["public"]["Enums"]["sponsorship_deal_status"]
          tier_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          deal_number?: string
          id?: string
          internal_notes?: string | null
          invoice_sent_at?: string | null
          invoiced_at?: string | null
          metadata?: Json | null
          offer_sent_at?: string | null
          paid_at?: string | null
          paid_by?: string | null
          sponsor_id?: string
          status?: Database["public"]["Enums"]["sponsorship_deal_status"]
          tier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_deals_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsorship_deals_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_invoices: {
        Row: {
          adjustments_total: number
          created_at: string
          credit_applied: number
          currency: string
          deal_id: string
          due_date: string
          id: string
          invoice_notes: string | null
          invoice_number: string
          invoice_pdf_source: string | null
          invoice_pdf_uploaded_at: string | null
          invoice_pdf_url: string | null
          issue_date: string
          subtotal: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          adjustments_total?: number
          created_at?: string
          credit_applied?: number
          currency: string
          deal_id: string
          due_date: string
          id?: string
          invoice_notes?: string | null
          invoice_number: string
          invoice_pdf_source?: string | null
          invoice_pdf_uploaded_at?: string | null
          invoice_pdf_url?: string | null
          issue_date?: string
          subtotal: number
          total_amount: number
          updated_at?: string
        }
        Update: {
          adjustments_total?: number
          created_at?: string
          credit_applied?: number
          currency?: string
          deal_id?: string
          due_date?: string
          id?: string
          invoice_notes?: string | null
          invoice_number?: string
          invoice_pdf_source?: string | null
          invoice_pdf_uploaded_at?: string | null
          invoice_pdf_url?: string | null
          issue_date?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_invoices_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_line_items: {
        Row: {
          created_at: string
          deal_id: string
          description: string
          display_order: number
          id: string
          quantity: number
          type: Database["public"]["Enums"]["sponsorship_line_item_type"]
          unit_price: number
          updated_at: string
          uses_credit: boolean
        }
        Insert: {
          created_at?: string
          deal_id: string
          description: string
          display_order?: number
          id?: string
          quantity?: number
          type: Database["public"]["Enums"]["sponsorship_line_item_type"]
          unit_price: number
          updated_at?: string
          uses_credit?: boolean
        }
        Update: {
          created_at?: string
          deal_id?: string
          description?: string
          display_order?: number
          id?: string
          quantity?: number
          type?: Database["public"]["Enums"]["sponsorship_line_item_type"]
          unit_price?: number
          updated_at?: string
          uses_credit?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_line_items_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_perks: {
        Row: {
          completed_at: string | null
          created_at: string
          deal_id: string
          description: string | null
          display_order: number
          id: string
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["sponsorship_perk_status"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deal_id: string
          description?: string | null
          display_order?: number
          id?: string
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["sponsorship_perk_status"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deal_id?: string
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["sponsorship_perk_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsorship_perks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "sponsorship_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorship_tiers: {
        Row: {
          addon_credit_chf: number
          addon_credit_eur: number
          created_at: string
          description: string
          display_order: number
          id: string
          is_active: boolean
          name: string
          price_chf: number
          price_eur: number
          updated_at: string
        }
        Insert: {
          addon_credit_chf?: number
          addon_credit_eur?: number
          created_at?: string
          description: string
          display_order: number
          id: string
          is_active?: boolean
          name: string
          price_chf: number
          price_eur: number
          updated_at?: string
        }
        Update: {
          addon_credit_chf?: number
          addon_credit_eur?: number
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          is_active?: boolean
          name?: string
          price_chf?: number
          price_eur?: number
          updated_at?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          amount_paid: number
          checked_in: boolean | null
          checked_in_at: string | null
          company: string | null
          coupon_code: string | null
          created_at: string
          currency: string
          discount_amount: number | null
          email: string
          first_name: string
          id: string
          job_title: string | null
          last_name: string
          metadata: Json | null
          partnership_coupon_id: string | null
          partnership_id: string | null
          partnership_voucher_id: string | null
          qr_code_url: string | null
          status: Database["public"]["Enums"]["payment_status"]
          stripe_customer_id: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string
          ticket_category: string
          ticket_stage: string
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          transferred_at: string | null
          transferred_from_email: string | null
          transferred_from_name: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_paid: number
          checked_in?: boolean | null
          checked_in_at?: string | null
          company?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number | null
          email: string
          first_name: string
          id?: string
          job_title?: string | null
          last_name: string
          metadata?: Json | null
          partnership_coupon_id?: string | null
          partnership_id?: string | null
          partnership_voucher_id?: string | null
          qr_code_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_customer_id: string
          stripe_payment_intent_id?: string | null
          stripe_session_id: string
          ticket_category: string
          ticket_stage: string
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          transferred_at?: string | null
          transferred_from_email?: string | null
          transferred_from_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_paid?: number
          checked_in?: boolean | null
          checked_in_at?: string | null
          company?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number | null
          email?: string
          first_name?: string
          id?: string
          job_title?: string | null
          last_name?: string
          metadata?: Json | null
          partnership_coupon_id?: string | null
          partnership_id?: string | null
          partnership_voucher_id?: string | null
          qr_code_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_customer_id?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string
          ticket_category?: string
          ticket_stage?: string
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          transferred_at?: string | null
          transferred_from_email?: string | null
          transferred_from_name?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_partnership_coupon_id_fkey"
            columns: ["partnership_coupon_id"]
            isOneToOne: false
            referencedRelation: "partnership_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_partnership_voucher_id_fkey"
            columns: ["partnership_voucher_id"]
            isOneToOne: false
            referencedRelation: "partnership_vouchers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_registrations: {
        Row: {
          amount_paid: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string
          ticket_id: string | null
          updated_at: string
          user_id: string
          workshop_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id: string
          ticket_id?: string | null
          updated_at?: string
          user_id: string
          workshop_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string
          ticket_id?: string | null
          updated_at?: string
          user_id?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_registrations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_registrations_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          capacity: number
          created_at: string
          currency: string
          date: string
          description: string
          end_time: string
          enrolled_count: number
          id: string
          instructor_id: string | null
          metadata: Json | null
          price: number
          start_time: string
          status: Database["public"]["Enums"]["workshop_status"]
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          currency?: string
          date: string
          description: string
          end_time: string
          enrolled_count?: number
          id?: string
          instructor_id?: string | null
          metadata?: Json | null
          price: number
          start_time: string
          status?: Database["public"]["Enums"]["workshop_status"]
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          currency?: string
          date?: string
          description?: string
          end_time?: string
          enrolled_count?: number
          id?: string
          instructor_id?: string | null
          metadata?: Json | null
          price?: number
          start_time?: string
          status?: Database["public"]["Enums"]["workshop_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshops_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      b2b_invoice_status: "draft" | "sent" | "paid" | "cancelled"
      cfp_flight_direction: "inbound" | "outbound"
      cfp_flight_status:
        | "pending"
        | "confirmed"
        | "checked_in"
        | "boarding"
        | "departed"
        | "arrived"
        | "cancelled"
        | "delayed"
      cfp_reimbursement_status: "pending" | "approved" | "rejected" | "paid"
      cfp_reimbursement_type: "flight" | "accommodation" | "transport" | "other"
      cfp_reviewer_role: "super_admin" | "reviewer" | "readonly"
      cfp_submission_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "shortlisted"
        | "waitlisted"
        | "accepted"
        | "rejected"
        | "withdrawn"
      cfp_submission_type: "lightning" | "standard" | "workshop"
      cfp_talk_level: "beginner" | "intermediate" | "advanced"
      coupon_type: "percentage" | "fixed_amount"
      partnership_status: "active" | "inactive" | "pending" | "expired"
      partnership_type: "community" | "individual" | "company" | "sponsor"
      payment_status: "pending" | "confirmed" | "cancelled" | "refunded"
      sponsorship_deal_status:
        | "draft"
        | "offer_sent"
        | "invoiced"
        | "invoice_sent"
        | "paid"
        | "cancelled"
      sponsorship_line_item_type: "tier_base" | "addon" | "adjustment"
      sponsorship_perk_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "not_applicable"
      ticket_type:
        | "blind_bird"
        | "early_bird"
        | "standard"
        | "student"
        | "unemployed"
        | "late_bird"
        | "vip"
      user_role: "attendee" | "speaker" | "admin"
      voucher_currency: "EUR" | "CHF"
      voucher_purpose:
        | "community_discount"
        | "raffle"
        | "giveaway"
        | "organizer_discount"
      workshop_status: "draft" | "published" | "cancelled" | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      b2b_invoice_status: ["draft", "sent", "paid", "cancelled"],
      cfp_flight_direction: ["inbound", "outbound"],
      cfp_flight_status: [
        "pending",
        "confirmed",
        "checked_in",
        "boarding",
        "departed",
        "arrived",
        "cancelled",
        "delayed",
      ],
      cfp_reimbursement_status: ["pending", "approved", "rejected", "paid"],
      cfp_reimbursement_type: ["flight", "accommodation", "transport", "other"],
      cfp_reviewer_role: ["super_admin", "reviewer", "readonly"],
      cfp_submission_status: [
        "draft",
        "submitted",
        "under_review",
        "shortlisted",
        "waitlisted",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      cfp_submission_type: ["lightning", "standard", "workshop"],
      cfp_talk_level: ["beginner", "intermediate", "advanced"],
      coupon_type: ["percentage", "fixed_amount"],
      partnership_status: ["active", "inactive", "pending", "expired"],
      partnership_type: ["community", "individual", "company", "sponsor"],
      payment_status: ["pending", "confirmed", "cancelled", "refunded"],
      sponsorship_deal_status: [
        "draft",
        "offer_sent",
        "invoiced",
        "invoice_sent",
        "paid",
        "cancelled",
      ],
      sponsorship_line_item_type: ["tier_base", "addon", "adjustment"],
      sponsorship_perk_status: [
        "pending",
        "in_progress",
        "completed",
        "not_applicable",
      ],
      ticket_type: [
        "blind_bird",
        "early_bird",
        "standard",
        "student",
        "unemployed",
        "late_bird",
        "vip",
      ],
      user_role: ["attendee", "speaker", "admin"],
      voucher_currency: ["EUR", "CHF"],
      voucher_purpose: [
        "community_discount",
        "raffle",
        "giveaway",
        "organizer_discount",
      ],
      workshop_status: ["draft", "published", "cancelled", "completed"],
    },
  },
} as const
