export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      cfp_decision_events: {
        Row: {
          admin_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["cfp_decision_event_type"]
          id: string
          metadata: Json | null
          new_status: Database["public"]["Enums"]["cfp_decision_status"]
          notes: string | null
          previous_status:
            | Database["public"]["Enums"]["cfp_decision_status"]
            | null
          submission_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["cfp_decision_event_type"]
          id?: string
          metadata?: Json | null
          new_status: Database["public"]["Enums"]["cfp_decision_status"]
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["cfp_decision_status"]
            | null
          submission_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["cfp_decision_event_type"]
          id?: string
          metadata?: Json | null
          new_status?: Database["public"]["Enums"]["cfp_decision_status"]
          notes?: string | null
          previous_status?:
            | Database["public"]["Enums"]["cfp_decision_status"]
            | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfp_decision_events_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "cfp_submissions"
            referencedColumns: ["id"]
          },
        ]
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
      cfp_scheduled_emails: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          coupon_code: string | null
          coupon_discount_percent: number | null
          coupon_expires_at: string | null
          created_at: string
          email_type: Database["public"]["Enums"]["cfp_email_type"]
          failed_at: string | null
          failure_reason: string | null
          feedback_text: string | null
          id: string
          include_feedback: boolean | null
          personal_message: string | null
          recipient_email: string
          recipient_name: string
          resend_email_id: string | null
          scheduled_by: string
          scheduled_for: string
          sent_at: string | null
          status: Database["public"]["Enums"]["cfp_scheduled_email_status"]
          submission_id: string
          talk_title: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          coupon_code?: string | null
          coupon_discount_percent?: number | null
          coupon_expires_at?: string | null
          created_at?: string
          email_type: Database["public"]["Enums"]["cfp_email_type"]
          failed_at?: string | null
          failure_reason?: string | null
          feedback_text?: string | null
          id?: string
          include_feedback?: boolean | null
          personal_message?: string | null
          recipient_email: string
          recipient_name: string
          resend_email_id?: string | null
          scheduled_by: string
          scheduled_for: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["cfp_scheduled_email_status"]
          submission_id: string
          talk_title: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          coupon_code?: string | null
          coupon_discount_percent?: number | null
          coupon_expires_at?: string | null
          created_at?: string
          email_type?: Database["public"]["Enums"]["cfp_email_type"]
          failed_at?: string | null
          failure_reason?: string | null
          feedback_text?: string | null
          id?: string
          include_feedback?: boolean | null
          personal_message?: string | null
          recipient_email?: string
          recipient_name?: string
          resend_email_id?: string | null
          scheduled_by?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["cfp_scheduled_email_status"]
          submission_id?: string
          talk_title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfp_scheduled_emails_submission_id_fkey"
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
      cfp_speaker_attendance: {
        Row: {
          confirmation_token: string
          created_at: string
          decline_notes: string | null
          decline_reason: string | null
          id: string
          responded_at: string | null
          speaker_id: string
          status: Database["public"]["Enums"]["cfp_attendance_status"]
          submission_id: string
          token_expires_at: string
          token_used_at: string | null
          updated_at: string
        }
        Insert: {
          confirmation_token: string
          created_at?: string
          decline_notes?: string | null
          decline_reason?: string | null
          id?: string
          responded_at?: string | null
          speaker_id: string
          status?: Database["public"]["Enums"]["cfp_attendance_status"]
          submission_id: string
          token_expires_at: string
          token_used_at?: string | null
          updated_at?: string
        }
        Update: {
          confirmation_token?: string
          created_at?: string
          decline_notes?: string | null
          decline_reason?: string | null
          id?: string
          responded_at?: string | null
          speaker_id?: string
          status?: Database["public"]["Enums"]["cfp_attendance_status"]
          submission_id?: string
          token_expires_at?: string
          token_used_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfp_speaker_attendance_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "cfp_speakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfp_speaker_attendance_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "cfp_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      cfp_speaker_flights: {
        Row: {
          admin_notes: string | null
          airline: string | null
          arrival_airport: string | null
          arrival_label: string | null
          arrival_time: string | null
          booking_reference: string | null
          cost_amount: number | null
          cost_currency: string | null
          created_at: string
          departure_airport: string | null
          departure_label: string | null
          departure_time: string | null
          direction: Database["public"]["Enums"]["cfp_flight_direction"]
          flight_number: string | null
          flight_status: Database["public"]["Enums"]["cfp_flight_status"] | null
          id: string
          last_status_update: string | null
          metadata: Json | null
          provider: string | null
          reference_code: string | null
          speaker_id: string
          tracking_url: string | null
          transport_link_url: string | null
          transport_mode: Database["public"]["Enums"]["cfp_transport_mode"]
          transport_status: Database["public"]["Enums"]["cfp_transport_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          airline?: string | null
          arrival_airport?: string | null
          arrival_label?: string | null
          arrival_time?: string | null
          booking_reference?: string | null
          cost_amount?: number | null
          cost_currency?: string | null
          created_at?: string
          departure_airport?: string | null
          departure_label?: string | null
          departure_time?: string | null
          direction: Database["public"]["Enums"]["cfp_flight_direction"]
          flight_number?: string | null
          flight_status?:
            | Database["public"]["Enums"]["cfp_flight_status"]
            | null
          id?: string
          last_status_update?: string | null
          metadata?: Json | null
          provider?: string | null
          reference_code?: string | null
          speaker_id: string
          tracking_url?: string | null
          transport_link_url?: string | null
          transport_mode?: Database["public"]["Enums"]["cfp_transport_mode"]
          transport_status?: Database["public"]["Enums"]["cfp_transport_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          airline?: string | null
          arrival_airport?: string | null
          arrival_label?: string | null
          arrival_time?: string | null
          booking_reference?: string | null
          cost_amount?: number | null
          cost_currency?: string | null
          created_at?: string
          departure_airport?: string | null
          departure_label?: string | null
          departure_time?: string | null
          direction?: Database["public"]["Enums"]["cfp_flight_direction"]
          flight_number?: string | null
          flight_status?:
            | Database["public"]["Enums"]["cfp_flight_status"]
            | null
          id?: string
          last_status_update?: string | null
          metadata?: Json | null
          provider?: string | null
          reference_code?: string | null
          speaker_id?: string
          tracking_url?: string | null
          transport_link_url?: string | null
          transport_mode?: Database["public"]["Enums"]["cfp_transport_mode"]
          transport_status?: Database["public"]["Enums"]["cfp_transport_status"]
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
          header_image_url: string | null
          id: string
          is_admin_managed: boolean
          is_featured: boolean
          is_visible: boolean
          job_title: string | null
          last_name: string
          linkedin_url: string | null
          mastodon_handle: string | null
          portrait_background_url: string | null
          portrait_foreground_url: string | null
          profile_image_url: string | null
          speaker_role: Database["public"]["Enums"]["cfp_speaker_role"]
          special_requirements: string | null
          travel_assistance_required: boolean | null
          travel_option: string | null
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
          header_image_url?: string | null
          id?: string
          is_admin_managed?: boolean
          is_featured?: boolean
          is_visible?: boolean
          job_title?: string | null
          last_name: string
          linkedin_url?: string | null
          mastodon_handle?: string | null
          portrait_background_url?: string | null
          portrait_foreground_url?: string | null
          profile_image_url?: string | null
          speaker_role?: Database["public"]["Enums"]["cfp_speaker_role"]
          special_requirements?: string | null
          travel_assistance_required?: boolean | null
          travel_option?: string | null
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
          header_image_url?: string | null
          id?: string
          is_admin_managed?: boolean
          is_featured?: boolean
          is_visible?: boolean
          job_title?: string | null
          last_name?: string
          linkedin_url?: string | null
          mastodon_handle?: string | null
          portrait_background_url?: string | null
          portrait_foreground_url?: string | null
          profile_image_url?: string | null
          speaker_role?: Database["public"]["Enums"]["cfp_speaker_role"]
          special_requirements?: string | null
          travel_assistance_required?: boolean | null
          travel_option?: string | null
          tshirt_size?: string | null
          twitter_handle?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cfp_submission_speakers: {
        Row: {
          created_at: string
          role: string
          speaker_id: string
          submission_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          speaker_id: string
          submission_id: string
        }
        Update: {
          created_at?: string
          role?: string
          speaker_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cfp_submission_speakers_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "cfp_speakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfp_submission_speakers_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "cfp_submissions"
            referencedColumns: ["id"]
          },
        ]
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
          acceptance_email_scheduled_for: string | null
          acceptance_email_scheduled_id: string | null
          additional_notes: string | null
          company_can_cover_travel: boolean | null
          coupon_code: string | null
          coupon_generated_at: string | null
          created_at: string
          decision_at: string | null
          decision_by: string | null
          decision_email_id: string | null
          decision_email_sent_at: string | null
          decision_notes: string | null
          decision_status:
            | Database["public"]["Enums"]["cfp_decision_status"]
            | null
          id: string
          metadata: Json | null
          outline: string | null
          previous_recording_url: string | null
          rejection_email_scheduled_for: string | null
          rejection_email_scheduled_id: string | null
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
          acceptance_email_scheduled_for?: string | null
          acceptance_email_scheduled_id?: string | null
          additional_notes?: string | null
          company_can_cover_travel?: boolean | null
          coupon_code?: string | null
          coupon_generated_at?: string | null
          created_at?: string
          decision_at?: string | null
          decision_by?: string | null
          decision_email_id?: string | null
          decision_email_sent_at?: string | null
          decision_notes?: string | null
          decision_status?:
            | Database["public"]["Enums"]["cfp_decision_status"]
            | null
          id?: string
          metadata?: Json | null
          outline?: string | null
          previous_recording_url?: string | null
          rejection_email_scheduled_for?: string | null
          rejection_email_scheduled_id?: string | null
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
          acceptance_email_scheduled_for?: string | null
          acceptance_email_scheduled_id?: string | null
          additional_notes?: string | null
          company_can_cover_travel?: boolean | null
          coupon_code?: string | null
          coupon_generated_at?: string | null
          created_at?: string
          decision_at?: string | null
          decision_by?: string | null
          decision_email_id?: string | null
          decision_email_sent_at?: string | null
          decision_notes?: string | null
          decision_status?:
            | Database["public"]["Enums"]["cfp_decision_status"]
            | null
          id?: string
          metadata?: Json | null
          outline?: string | null
          previous_recording_url?: string | null
          rejection_email_scheduled_for?: string | null
          rejection_email_scheduled_id?: string | null
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
            foreignKeyName: "cfp_submissions_acceptance_email_scheduled_id_fkey"
            columns: ["acceptance_email_scheduled_id"]
            isOneToOne: false
            referencedRelation: "cfp_scheduled_emails"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cfp_submissions_rejection_email_scheduled_id_fkey"
            columns: ["rejection_email_scheduled_id"]
            isOneToOne: false
            referencedRelation: "cfp_scheduled_emails"
            referencedColumns: ["id"]
          },
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
      checkout_cart_snapshots: {
        Row: {
          cart_items: Json
          created_at: string
          expires_at: string
          stripe_session_id: string
          workshop_attendees: Json
        }
        Insert: {
          cart_items?: Json
          created_at?: string
          expires_at?: string
          stripe_session_id: string
          workshop_attendees?: Json
        }
        Update: {
          cart_items?: Json
          created_at?: string
          expires_at?: string
          stripe_session_id?: string
          workshop_attendees?: Json
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
      program_schedule_items: {
        Row: {
          created_at: string
          date: string
          description: string | null
          duration_minutes: number
          id: string
          is_visible: boolean
          room: string | null
          session_id: string | null
          start_time: string
          submission_id: string | null
          title: string
          type: Database["public"]["Enums"]["program_schedule_item_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          duration_minutes: number
          id?: string
          is_visible?: boolean
          room?: string | null
          session_id?: string | null
          start_time: string
          submission_id?: string | null
          title: string
          type: Database["public"]["Enums"]["program_schedule_item_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_visible?: boolean
          room?: string | null
          session_id?: string | null
          start_time?: string
          submission_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["program_schedule_item_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_schedule_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "program_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_schedule_items_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "cfp_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      program_session_speakers: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["program_session_speaker_role"]
          session_id: string
          sort_order: number
          speaker_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["program_session_speaker_role"]
          session_id: string
          sort_order?: number
          speaker_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["program_session_speaker_role"]
          session_id?: string
          sort_order?: number
          speaker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_session_speakers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "program_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_session_speakers_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "cfp_speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      program_sessions: {
        Row: {
          abstract: string | null
          cfp_submission_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["program_session_kind"]
          level: Database["public"]["Enums"]["cfp_talk_level"] | null
          metadata: Json
          status: Database["public"]["Enums"]["program_session_status"]
          title: string
          updated_at: string
          workshop_capacity: number | null
          workshop_duration_minutes: number | null
        }
        Insert: {
          abstract?: string | null
          cfp_submission_id?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["program_session_kind"]
          level?: Database["public"]["Enums"]["cfp_talk_level"] | null
          metadata?: Json
          status?: Database["public"]["Enums"]["program_session_status"]
          title: string
          updated_at?: string
          workshop_capacity?: number | null
          workshop_duration_minutes?: number | null
        }
        Update: {
          abstract?: string | null
          cfp_submission_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["program_session_kind"]
          level?: Database["public"]["Enums"]["cfp_talk_level"] | null
          metadata?: Json
          status?: Database["public"]["Enums"]["program_session_status"]
          title?: string
          updated_at?: string
          workshop_capacity?: number | null
          workshop_duration_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "program_sessions_cfp_submission_id_fkey"
            columns: ["cfp_submission_id"]
            isOneToOne: false
            referencedRelation: "cfp_submissions"
            referencedColumns: ["id"]
          },
        ]
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
          logo_url_color?: string | null
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
          logo_url_color?: string | null
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
          base_amount_chf: number | null
          base_currency: string
          conversion_justification: string | null
          conversion_rate_chf_to_eur: number | null
          conversion_rate_source:
            | Database["public"]["Enums"]["sponsorship_conversion_rate_source"]
            | null
          conversion_updated_at: string | null
          conversion_updated_by: string | null
          converted_amount_eur: number | null
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
          payable_currency: string | null
          subtotal: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          adjustments_total?: number
          base_amount_chf?: number | null
          base_currency?: string
          conversion_justification?: string | null
          conversion_rate_chf_to_eur?: number | null
          conversion_rate_source?:
            | Database["public"]["Enums"]["sponsorship_conversion_rate_source"]
            | null
          conversion_updated_at?: string | null
          conversion_updated_by?: string | null
          converted_amount_eur?: number | null
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
          payable_currency?: string | null
          subtotal: number
          total_amount: number
          updated_at?: string
        }
        Update: {
          adjustments_total?: number
          base_amount_chf?: number | null
          base_currency?: string
          conversion_justification?: string | null
          conversion_rate_chf_to_eur?: number | null
          conversion_rate_source?:
            | Database["public"]["Enums"]["sponsorship_conversion_rate_source"]
            | null
          conversion_updated_at?: string | null
          conversion_updated_by?: string | null
          converted_amount_eur?: number | null
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
          payable_currency?: string | null
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
      ticket_invoices: {
        Row: {
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_company: string | null
          billing_country: string | null
          billing_email: string
          billing_name: string
          billing_postal_code: string | null
          billing_state: string | null
          created_at: string
          currency: string
          discount_amount: number
          generated_at: string
          generated_by: string | null
          id: string
          invoice_number: string
          line_items: Json | null
          notes: string | null
          pdf_source: string | null
          pdf_url: string | null
          primary_ticket_id: string
          stripe_session_id: string
          subtotal_amount: number
          ticket_ids: string[]
          total_amount: number
          updated_at: string
        }
        Insert: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_company?: string | null
          billing_country?: string | null
          billing_email: string
          billing_name: string
          billing_postal_code?: string | null
          billing_state?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          generated_at?: string
          generated_by?: string | null
          id?: string
          invoice_number?: string
          line_items?: Json | null
          notes?: string | null
          pdf_source?: string | null
          pdf_url?: string | null
          primary_ticket_id: string
          stripe_session_id: string
          subtotal_amount?: number
          ticket_ids?: string[]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_company?: string | null
          billing_country?: string | null
          billing_email?: string
          billing_name?: string
          billing_postal_code?: string | null
          billing_state?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          generated_at?: string
          generated_by?: string | null
          id?: string
          invoice_number?: string
          line_items?: Json | null
          notes?: string | null
          pdf_source?: string | null
          pdf_url?: string | null
          primary_ticket_id?: string
          stripe_session_id?: string
          subtotal_amount?: number
          ticket_ids?: string[]
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      ticket_upgrades: {
        Row: {
          admin_note: string | null
          admin_user_id: string | null
          amount: number | null
          bank_transfer_due_date: string | null
          bank_transfer_reference: string | null
          completed_at: string | null
          created_at: string
          currency: string | null
          email_sent_at: string | null
          from_tier: string
          id: string
          idempotency_key: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_link_id: string | null
          stripe_payment_link_url: string | null
          ticket_id: string
          to_tier: string
          updated_at: string
          upgrade_mode: string
        }
        Insert: {
          admin_note?: string | null
          admin_user_id?: string | null
          amount?: number | null
          bank_transfer_due_date?: string | null
          bank_transfer_reference?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          email_sent_at?: string | null
          from_tier: string
          id?: string
          idempotency_key: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_link_id?: string | null
          stripe_payment_link_url?: string | null
          ticket_id: string
          to_tier?: string
          updated_at?: string
          upgrade_mode: string
        }
        Update: {
          admin_note?: string | null
          admin_user_id?: string | null
          amount?: number | null
          bank_transfer_due_date?: string | null
          bank_transfer_reference?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          email_sent_at?: string | null
          from_tier?: string
          id?: string
          idempotency_key?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_link_id?: string | null
          stripe_payment_link_url?: string | null
          ticket_id?: string
          to_tier?: string
          updated_at?: string
          upgrade_mode?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_upgrades_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_perk_config: {
        Row: {
          auto_send_email: boolean
          custom_email_message: string | null
          discount_percent: number
          expires_at: string | null
          id: string
          restricted_product_ids: string[]
          updated_at: string
        }
        Insert: {
          auto_send_email?: boolean
          custom_email_message?: string | null
          discount_percent?: number
          expires_at?: string | null
          id?: string
          restricted_product_ids?: string[]
          updated_at?: string
        }
        Update: {
          auto_send_email?: boolean
          custom_email_message?: string | null
          discount_percent?: number
          expires_at?: string | null
          id?: string
          restricted_product_ids?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      vip_perk_emails: {
        Row: {
          created_at: string
          custom_message: string | null
          id: string
          recipient_email: string
          recipient_name: string
          resend_message_id: string | null
          sent_at: string
          status: string
          subject: string
          ticket_id: string
          vip_perk_id: string
        }
        Insert: {
          created_at?: string
          custom_message?: string | null
          id?: string
          recipient_email: string
          recipient_name: string
          resend_message_id?: string | null
          sent_at?: string
          status?: string
          subject: string
          ticket_id: string
          vip_perk_id: string
        }
        Update: {
          created_at?: string
          custom_message?: string | null
          id?: string
          recipient_email?: string
          recipient_name?: string
          resend_message_id?: string | null
          sent_at?: string
          status?: string
          subject?: string
          ticket_id?: string
          vip_perk_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_perk_emails_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vip_perk_emails_vip_perk_id_fkey"
            columns: ["vip_perk_id"]
            isOneToOne: false
            referencedRelation: "vip_perks"
            referencedColumns: ["id"]
          },
        ]
      }
      vip_perks: {
        Row: {
          code: string
          created_at: string
          current_redemptions: number
          discount_percent: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_redemptions: number | null
          restricted_product_ids: string[]
          stripe_coupon_id: string
          stripe_promotion_code_id: string | null
          ticket_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_redemptions?: number
          discount_percent?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          restricted_product_ids?: string[]
          stripe_coupon_id: string
          stripe_promotion_code_id?: string | null
          ticket_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_redemptions?: number
          discount_percent?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          restricted_product_ids?: string[]
          stripe_coupon_id?: string
          stripe_promotion_code_id?: string | null
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vip_perks_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: true
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
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
          checked_in: boolean
          checked_in_at: string | null
          company: string | null
          coupon_code: string | null
          created_at: string
          currency: string
          discount_amount: number
          email: string | null
          first_name: string | null
          id: string
          job_title: string | null
          last_name: string | null
          metadata: Json | null
          partnership_coupon_id: string | null
          partnership_voucher_id: string | null
          qr_code_url: string | null
          seat_index: number
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id: string | null
          stripe_session_id: string
          ticket_id: string | null
          updated_at: string
          user_id: string | null
          workshop_id: string
        }
        Insert: {
          amount_paid: number
          checked_in?: boolean
          checked_in_at?: string | null
          company?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          email?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          metadata?: Json | null
          partnership_coupon_id?: string | null
          partnership_voucher_id?: string | null
          qr_code_url?: string | null
          seat_index?: number
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id: string
          ticket_id?: string | null
          updated_at?: string
          user_id?: string | null
          workshop_id: string
        }
        Update: {
          amount_paid?: number
          checked_in?: boolean
          checked_in_at?: string | null
          company?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          email?: string | null
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          metadata?: Json | null
          partnership_coupon_id?: string | null
          partnership_voucher_id?: string | null
          qr_code_url?: string | null
          seat_index?: number
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string
          ticket_id?: string | null
          updated_at?: string
          user_id?: string | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_registrations_partnership_coupon_id_fkey"
            columns: ["partnership_coupon_id"]
            isOneToOne: false
            referencedRelation: "partnership_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_registrations_partnership_voucher_id_fkey"
            columns: ["partnership_voucher_id"]
            isOneToOne: false
            referencedRelation: "partnership_vouchers"
            referencedColumns: ["id"]
          },
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
      verification_requests: {
        Row: {
          additional_info: string | null
          country_code: string | null
          created_at: string
          currency: string | null
          email: string
          id: string
          linkedin_url: string | null
          name: string
          price_id: string
          rav_registration_date: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          stripe_payment_link_id: string | null
          stripe_payment_link_url: string | null
          stripe_session_id: string | null
          student_id: string | null
          university: string | null
          updated_at: string
          verification_id: string
          verification_type: string
        }
        Insert: {
          additional_info?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          email: string
          id?: string
          linkedin_url?: string | null
          name: string
          price_id: string
          rav_registration_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          stripe_payment_link_id?: string | null
          stripe_payment_link_url?: string | null
          stripe_session_id?: string | null
          student_id?: string | null
          university?: string | null
          updated_at?: string
          verification_id: string
          verification_type: string
        }
        Update: {
          additional_info?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          email?: string
          id?: string
          linkedin_url?: string | null
          name?: string
          price_id?: string
          rav_registration_date?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          stripe_payment_link_id?: string | null
          stripe_payment_link_url?: string | null
          stripe_session_id?: string | null
          student_id?: string | null
          university?: string | null
          updated_at?: string
          verification_id?: string
          verification_type?: string
        }
        Relationships: []
      }
      workshops: {
        Row: {
          capacity: number
          cfp_submission_id: string | null
          created_at: string
          currency: string
          date: string | null
          description: string
          duration_minutes: number | null
          end_time: string | null
          enrolled_count: number
          id: string
          instructor_id: string | null
          metadata: Json | null
          price: number | null
          room: string | null
          session_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["workshop_status"]
          stripe_price_lookup_key: string | null
          stripe_product_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          cfp_submission_id?: string | null
          created_at?: string
          currency?: string
          date?: string | null
          description: string
          duration_minutes?: number | null
          end_time?: string | null
          enrolled_count?: number
          id?: string
          instructor_id?: string | null
          metadata?: Json | null
          price?: number | null
          room?: string | null
          session_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["workshop_status"]
          stripe_price_lookup_key?: string | null
          stripe_product_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          cfp_submission_id?: string | null
          created_at?: string
          currency?: string
          date?: string | null
          description?: string
          duration_minutes?: number | null
          end_time?: string | null
          enrolled_count?: number
          id?: string
          instructor_id?: string | null
          metadata?: Json | null
          price?: number | null
          room?: string | null
          session_id?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["workshop_status"]
          stripe_price_lookup_key?: string | null
          stripe_product_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshops_cfp_submission_id_fkey"
            columns: ["cfp_submission_id"]
            isOneToOne: false
            referencedRelation: "cfp_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshops_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshops_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "program_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      insert_workshop_registration_atomic: {
        Args: {
          p_amount_paid: number
          p_coupon_code: string
          p_currency: string
          p_discount_amount: number
          p_email: string
          p_first_name: string
          p_last_name: string
          p_metadata: Json
          p_partnership_coupon_id: string
          p_partnership_voucher_id: string
          p_seat_index: number
          p_status: Database["public"]["Enums"]["payment_status"]
          p_stripe_payment_intent_id: string
          p_stripe_session_id: string
          p_ticket_id: string
          p_user_id: string
          p_workshop_id: string
        }
        Returns: {
          registration: Database["public"]["Tables"]["workshop_registrations"]["Row"]
          was_duplicate: boolean
          was_oversold: boolean
        }[]
      }
    }
    Enums: {
      b2b_invoice_status: "draft" | "sent" | "paid" | "cancelled"
      cfp_attendance_status: "pending" | "confirmed" | "declined"
      cfp_decision_event_type:
        | "decision_made"
        | "email_sent"
        | "coupon_generated"
        | "decision_changed"
      cfp_decision_status: "undecided" | "accepted" | "rejected"
      cfp_email_type: "acceptance" | "rejection"
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
      cfp_reviewer_role:
        | "super_admin"
        | "reviewer"
        | "readonly"
        | "committee_member"
      cfp_scheduled_email_status: "pending" | "sent" | "cancelled" | "failed"
      cfp_speaker_role: "speaker" | "mc"
      cfp_submission_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "shortlisted"
        | "waitlisted"
        | "accepted"
        | "rejected"
        | "withdrawn"
      cfp_submission_type: "lightning" | "standard" | "workshop" | "panel"
      cfp_talk_level: "beginner" | "intermediate" | "advanced"
      cfp_transport_mode: "flight" | "train" | "link_only" | "none"
      cfp_transport_status: "scheduled" | "delayed" | "canceled" | "complete"
      coupon_type: "percentage" | "fixed_amount"
      partnership_status: "active" | "inactive" | "pending" | "expired"
      partnership_type: "community" | "individual" | "company" | "sponsor"
      payment_status: "pending" | "confirmed" | "cancelled" | "refunded"
      program_schedule_item_type: "session" | "event" | "break" | "placeholder"
      program_session_kind: "talk" | "workshop" | "panel" | "keynote" | "event"
      program_session_speaker_role:
        | "speaker"
        | "panelist"
        | "host"
        | "mc"
        | "instructor"
      program_session_status: "draft" | "confirmed" | "published" | "archived"
      sponsorship_conversion_rate_source: "ecb" | "bank" | "manual" | "other"
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
      voucher_currency: "EUR" | "CHF" | "GBP" | "USD"
      voucher_purpose:
        | "community_discount"
        | "raffle"
        | "giveaway"
        | "organizer_discount"
      workshop_status:
        | "draft"
        | "published"
        | "cancelled"
        | "completed"
        | "archived"
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
      cfp_attendance_status: ["pending", "confirmed", "declined"],
      cfp_decision_event_type: [
        "decision_made",
        "email_sent",
        "coupon_generated",
        "decision_changed",
      ],
      cfp_decision_status: ["undecided", "accepted", "rejected"],
      cfp_email_type: ["acceptance", "rejection"],
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
      cfp_reviewer_role: [
        "super_admin",
        "reviewer",
        "readonly",
        "committee_member",
      ],
      cfp_scheduled_email_status: ["pending", "sent", "cancelled", "failed"],
      cfp_speaker_role: ["speaker", "mc"],
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
      cfp_submission_type: ["lightning", "standard", "workshop", "panel"],
      cfp_talk_level: ["beginner", "intermediate", "advanced"],
      cfp_transport_mode: ["flight", "train", "link_only", "none"],
      cfp_transport_status: ["scheduled", "delayed", "canceled", "complete"],
      coupon_type: ["percentage", "fixed_amount"],
      partnership_status: ["active", "inactive", "pending", "expired"],
      partnership_type: ["community", "individual", "company", "sponsor"],
      payment_status: ["pending", "confirmed", "cancelled", "refunded"],
      program_schedule_item_type: ["session", "event", "break", "placeholder"],
      program_session_kind: ["talk", "workshop", "panel", "keynote", "event"],
      program_session_speaker_role: [
        "speaker",
        "panelist",
        "host",
        "mc",
        "instructor",
      ],
      program_session_status: ["draft", "confirmed", "published", "archived"],
      sponsorship_conversion_rate_source: ["ecb", "bank", "manual", "other"],
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
      voucher_currency: ["EUR", "CHF", "GBP", "USD"],
      voucher_purpose: [
        "community_discount",
        "raffle",
        "giveaway",
        "organizer_discount",
      ],
      workshop_status: [
        "draft",
        "published",
        "cancelled",
        "completed",
        "archived",
      ],
    },
  },
} as const

