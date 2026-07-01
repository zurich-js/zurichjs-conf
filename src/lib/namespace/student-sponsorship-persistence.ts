import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';
import type {
  NamespaceStudentSponsorshipApplication,
  NamespaceStudentSponsorshipStatus,
} from '@/lib/types/namespace';

export interface PersistNamespaceStudentSponsorshipInput {
  applicationId?: string;
  email: string;
  fullName?: string;
  universityName?: string;
  degreeName?: string;
  githubUrl?: string;
  codeUrl?: string;
  setupInstructions?: string;
  prideExplanation?: string;
  anythingElse?: string;
  processingConsent: boolean;
  status: NamespaceStudentSponsorshipStatus;
  posthogSessionId?: string;
  posthogDistinctId?: string;
  userAgent?: string | string[];
}

function cleanOptional(value: string | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createNamespaceServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error('Missing Supabase configuration for Namespace sponsorship persistence');
  }

  return createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeUserAgent(userAgent: string | string[] | undefined): string | null | undefined {
  if (Array.isArray(userAgent)) {
    return userAgent.join(', ');
  }

  return cleanOptional(userAgent);
}

function buildPayload(input: PersistNamespaceStudentSponsorshipInput) {
  const hasSubmitted = input.status === 'submission_failed' || input.status === 'email_sent';

  return {
    email: normalizeEmail(input.email),
    full_name: cleanOptional(input.fullName),
    university_name: cleanOptional(input.universityName),
    degree_name: cleanOptional(input.degreeName),
    github_url: cleanOptional(input.githubUrl),
    code_url: cleanOptional(input.codeUrl),
    setup_instructions: cleanOptional(input.setupInstructions),
    pride_explanation: cleanOptional(input.prideExplanation),
    anything_else: cleanOptional(input.anythingElse),
    processing_consent: input.processingConsent,
    status: input.status,
    posthog_session_id: cleanOptional(input.posthogSessionId),
    posthog_distinct_id: cleanOptional(input.posthogDistinctId),
    user_agent: normalizeUserAgent(input.userAgent),
    submitted_at: hasSubmitted ? new Date().toISOString() : undefined,
  };
}

export async function persistNamespaceStudentSponsorshipApplication(
  input: PersistNamespaceStudentSponsorshipInput
): Promise<{ application: NamespaceStudentSponsorshipApplication | null; error?: string }> {
  const supabase = createNamespaceServiceClient();
  const payload = buildPayload(input);

  if (input.applicationId) {
    const { data, error } = await supabase
      .from('namespace_student_sponsorship_applications')
      .update(payload)
      .eq('id', input.applicationId)
      .select('*')
      .single();

    if (!error && data) {
      return { application: data };
    }
  }

  const { data: existing } = await supabase
    .from('namespace_student_sponsorship_applications')
    .select('*')
    .eq('email', payload.email)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('namespace_student_sponsorship_applications')
      .update(payload)
      .eq('id', existing.id)
      .select('*')
      .single();

    return {
      application: data,
      error: error?.message,
    };
  }

  const { data, error } = await supabase
    .from('namespace_student_sponsorship_applications')
    .insert(payload)
    .select('*')
    .single();

  return {
    application: data,
    error: error?.message,
  };
}

export async function listNamespaceStudentSponsorshipApplications(): Promise<{
  applications: NamespaceStudentSponsorshipApplication[];
  error?: string;
}> {
  const supabase = createNamespaceServiceClient();
  const { data, error } = await supabase
    .from('namespace_student_sponsorship_applications')
    .select('*')
    .order('updated_at', { ascending: false });

  return {
    applications: data ?? [],
    error: error?.message,
  };
}

export async function isNamespaceStudentSponsorshipReviewer(email: string): Promise<boolean> {
  const supabase = createNamespaceServiceClient();
  const { data } = await supabase
    .from('namespace_student_sponsorship_reviewers')
    .select('id')
    .ilike('email', normalizeEmail(email))
    .maybeSingle();

  return !!data;
}
