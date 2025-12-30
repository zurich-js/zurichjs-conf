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
      partnership_emails: {
        Row: {
          id: string
          partnership_id: string
          recipient_email: string
          recipient_name: string
          subject: string
          resend_message_id: string | null
          included_coupons: boolean
          included_vouchers: boolean
          included_logo: boolean
          included_banner: boolean | null
          custom_message: string | null
          status: string
          sent_at: string
          created_at: string
        }
        Insert: {
          id?: string
          partnership_id: string
          recipient_email: string
          recipient_name: string
          subject: string
          resend_message_id?: string | null
          included_coupons?: boolean
          included_vouchers?: boolean
          included_logo?: boolean
          included_banner?: boolean | null
          custom_message?: string | null
          status?: string
          sent_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          partnership_id?: string
          recipient_email?: string
          recipient_name?: string
          subject?: string
          resend_message_id?: string | null
          included_coupons?: boolean
          included_vouchers?: boolean
          included_logo?: boolean
          included_banner?: boolean | null
          custom_message?: string | null
          status?: string
          sent_at?: string
          created_at?: string
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
      partnership_coupons: {
        Row: {
          id: string
          partnership_id: string
          stripe_coupon_id: string
          stripe_promotion_code_id: string | null
          code: string
          type: "percentage" | "fixed_amount"
          discount_percent: number | null
          discount_amount: number | null
          currency: "EUR" | "CHF" | null
          restricted_product_ids: string[]
          max_redemptions: number | null
          current_redemptions: number
          expires_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          partnership_id: string
          stripe_coupon_id: string
          stripe_promotion_code_id?: string | null
          code: string
          type: "percentage" | "fixed_amount"
          discount_percent?: number | null
          discount_amount?: number | null
          currency?: "EUR" | "CHF" | null
          restricted_product_ids?: string[]
          max_redemptions?: number | null
          current_redemptions?: number
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          partnership_id?: string
          stripe_coupon_id?: string
          stripe_promotion_code_id?: string | null
          code?: string
          type?: "percentage" | "fixed_amount"
          discount_percent?: number | null
          discount_amount?: number | null
          currency?: "EUR" | "CHF" | null
          restricted_product_ids?: string[]
          max_redemptions?: number | null
          current_redemptions?: number
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
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
      partnership_vouchers: {
        Row: {
          id: string
          partnership_id: string
          stripe_coupon_id: string
          stripe_promotion_code_id: string | null
          code: string
          purpose: "community_discount" | "raffle" | "giveaway" | "organizer_discount"
          amount: number
          currency: "EUR" | "CHF"
          recipient_name: string | null
          recipient_email: string | null
          is_redeemed: boolean
          redeemed_at: string | null
          redeemed_by_email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          partnership_id: string
          stripe_coupon_id: string
          stripe_promotion_code_id?: string | null
          code: string
          purpose: "community_discount" | "raffle" | "giveaway" | "organizer_discount"
          amount: number
          currency: "EUR" | "CHF"
          recipient_name?: string | null
          recipient_email?: string | null
          is_redeemed?: boolean
          redeemed_at?: string | null
          redeemed_by_email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          partnership_id?: string
          stripe_coupon_id?: string
          stripe_promotion_code_id?: string | null
          code?: string
          purpose?: "community_discount" | "raffle" | "giveaway" | "organizer_discount"
          amount?: number
          currency?: "EUR" | "CHF"
          recipient_name?: string | null
          recipient_email?: string | null
          is_redeemed?: boolean
          redeemed_at?: string | null
          redeemed_by_email?: string | null
          created_at?: string
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
          id: string
          name: string
          type: "community" | "individual" | "company" | "sponsor"
          status: "active" | "inactive" | "pending" | "expired"
          contact_name: string
          contact_email: string
          contact_phone: string | null
          company_name: string | null
          company_website: string | null
          company_logo_url: string | null
          utm_source: string
          utm_medium: string
          utm_campaign: string
          notes: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          type: "community" | "individual" | "company" | "sponsor"
          status?: "active" | "inactive" | "pending" | "expired"
          contact_name: string
          contact_email: string
          contact_phone?: string | null
          company_name?: string | null
          company_website?: string | null
          company_logo_url?: string | null
          utm_source: string
          utm_medium: string
          utm_campaign: string
          notes?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: "community" | "individual" | "company" | "sponsor"
          status?: "active" | "inactive" | "pending" | "expired"
          contact_name?: string
          contact_email?: string
          contact_phone?: string | null
          company_name?: string | null
          company_website?: string | null
          company_logo_url?: string | null
          utm_source?: string
          utm_medium?: string
          utm_campaign?: string
          notes?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          invoice_number: string
          invoice_notes: string | null
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
          invoice_number: string
          invoice_notes?: string | null
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
          invoice_number?: string
          invoice_notes?: string | null
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
      tickets: {
        Row: {
          amount_paid: number
          checked_in: boolean | null
          checked_in_at: string | null
          company: string | null
          created_at: string
          currency: string
          email: string
          first_name: string
          id: string
          job_title: string | null
          last_name: string
          metadata: Json | null
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
          created_at?: string
          currency?: string
          email: string
          first_name: string
          id?: string
          job_title?: string | null
          last_name: string
          metadata?: Json | null
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
          created_at?: string
          currency?: string
          email?: string
          first_name?: string
          id?: string
          job_title?: string | null
          last_name?: string
          metadata?: Json | null
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
      payment_status: "pending" | "confirmed" | "cancelled" | "refunded"
      ticket_type:
        | "blind_bird"
        | "early_bird"
        | "standard"
        | "student"
        | "unemployed"
        | "late_bird"
        | "vip"
      user_role: "attendee" | "speaker" | "admin"
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
      payment_status: ["pending", "confirmed", "cancelled", "refunded"],
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
      workshop_status: ["draft", "published", "cancelled", "completed"],
    },
  },
} as const
