import { apiClient, endpoints } from './index';
import type { NamespaceStudentSponsorshipFormData } from '@/lib/validations/namespace';

export type NamespaceStudentSponsorshipSubmitRequest =
  NamespaceStudentSponsorshipFormData;

export interface NamespaceStudentSponsorshipSubmitResponse {
  success: boolean;
  submissionId?: string;
  error?: string;
  issues?: Array<{ path: string; message: string }>;
  fallbackUrl: string;
  remaining?: number;
}

export interface NamespaceStudentSponsorshipLeadRequest {
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
  posthogSessionId?: string;
  posthogDistinctId?: string;
}

export interface NamespaceStudentSponsorshipLeadResponse {
  success: boolean;
  applicationId?: string;
  error?: string;
  remaining?: number;
}

export async function submitNamespaceStudentSponsorship(
  data: NamespaceStudentSponsorshipSubmitRequest
): Promise<NamespaceStudentSponsorshipSubmitResponse> {
  return apiClient.post<
    NamespaceStudentSponsorshipSubmitResponse,
    NamespaceStudentSponsorshipSubmitRequest
  >(endpoints.namespace.studentSponsorship(), data);
}

export async function captureNamespaceStudentSponsorshipLead(
  data: NamespaceStudentSponsorshipLeadRequest
): Promise<NamespaceStudentSponsorshipLeadResponse> {
  return apiClient.post<
    NamespaceStudentSponsorshipLeadResponse,
    NamespaceStudentSponsorshipLeadRequest
  >(endpoints.namespace.studentSponsorshipLead(), data);
}
