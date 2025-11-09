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
