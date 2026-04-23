export type ProgramSessionKind = 'talk' | 'workshop' | 'panel' | 'keynote' | 'event';
export type ProgramSessionStatus = 'draft' | 'confirmed' | 'published' | 'archived';
export type ProgramSessionSpeakerRole = 'speaker' | 'panelist' | 'host' | 'mc' | 'instructor';
export type ProgramSessionLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ProgramSessionSpeakerAssignment {
  session_id: string;
  speaker_id: string;
  role: ProgramSessionSpeakerRole;
  sort_order: number;
  created_at?: string;
  speaker?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    job_title?: string | null;
    company?: string | null;
    profile_image_url?: string | null;
    speaker_role?: 'speaker' | 'mc';
  };
}

export interface ProgramSession {
  id: string;
  cfp_submission_id: string | null;
  kind: ProgramSessionKind;
  title: string;
  abstract: string | null;
  level: ProgramSessionLevel | null;
  status: ProgramSessionStatus;
  workshop_duration_minutes: number | null;
  workshop_capacity: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  speakers?: ProgramSessionSpeakerAssignment[];
}

export interface ProgramSessionInput {
  cfp_submission_id?: string | null;
  kind: ProgramSessionKind;
  title: string;
  abstract?: string | null;
  level?: ProgramSessionLevel | null;
  status?: ProgramSessionStatus;
  workshop_duration_minutes?: number | null;
  workshop_capacity?: number | null;
  metadata?: Record<string, unknown>;
  speakers?: ProgramSessionSpeakerInput[];
}

export interface ProgramSessionUpdateInput {
  kind?: ProgramSessionKind;
  title?: string;
  abstract?: string | null;
  level?: ProgramSessionLevel | null;
  status?: ProgramSessionStatus;
  workshop_duration_minutes?: number | null;
  workshop_capacity?: number | null;
  metadata?: Record<string, unknown>;
}

export interface ProgramSessionSpeakerInput {
  speaker_id: string;
  role?: ProgramSessionSpeakerRole;
  sort_order?: number;
}

export interface PromoteCfpSubmissionInput {
  submission_id: string;
  status?: ProgramSessionStatus;
}

export interface WorkshopOfferingInput {
  session_id: string;
  title?: string;
  description?: string;
  capacity?: number;
  room?: string | null;
  duration_minutes?: number | null;
  stripe_product_id?: string | null;
  stripe_price_lookup_key?: string | null;
  stripe_validation?: Record<string, unknown>;
  status?: 'draft' | 'published' | 'cancelled' | 'completed' | 'archived';
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}

export interface StripeValidationResult {
  valid: boolean;
  lookupKey: string;
  stripeProductId: string | null;
  validatedAt: string;
  results: Array<Record<string, unknown>>;
  missing: string[];
  productMismatch: boolean;
  productMismatchWithExpected: boolean;
}
