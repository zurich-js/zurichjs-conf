export type NamespaceStudentSponsorshipStatus =
  | 'partial'
  | 'submission_failed'
  | 'email_sent';

export interface NamespaceStudentSponsorshipApplication {
  id: string;
  email: string;
  full_name: string | null;
  university_name: string | null;
  degree_name: string | null;
  github_url: string | null;
  code_url: string | null;
  setup_instructions: string | null;
  pride_explanation: string | null;
  anything_else: string | null;
  processing_consent: boolean;
  status: string;
  posthog_session_id: string | null;
  posthog_distinct_id: string | null;
  user_agent: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NamespaceStudentSponsorshipReviewer {
  id: string;
  email: string;
  created_at: string;
}

export interface NamespaceSupabaseDatabase {
  public: {
    Tables: {
      namespace_student_sponsorship_applications: {
        Row: NamespaceStudentSponsorshipApplication;
        Insert: Partial<NamespaceStudentSponsorshipApplication> & {
          email: string;
          processing_consent: boolean;
        };
        Update: Partial<NamespaceStudentSponsorshipApplication>;
        Relationships: [];
      };
      namespace_student_sponsorship_reviewers: {
        Row: NamespaceStudentSponsorshipReviewer;
        Insert: Partial<NamespaceStudentSponsorshipReviewer> & {
          email: string;
        };
        Update: Partial<NamespaceStudentSponsorshipReviewer>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
