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

export async function submitNamespaceStudentSponsorship(
  data: NamespaceStudentSponsorshipSubmitRequest
): Promise<NamespaceStudentSponsorshipSubmitResponse> {
  return apiClient.post<
    NamespaceStudentSponsorshipSubmitResponse,
    NamespaceStudentSponsorshipSubmitRequest
  >(endpoints.namespace.studentSponsorship(), data);
}
