/**
 * Contact API Client
 * Type-safe function for submitting the contact form (inquiries & feedback)
 */

import { apiClient, endpoints } from './index';
import type { ContactType } from '@/lib/validations/contact';

/**
 * Contact form submission request
 */
export interface ContactSubmitRequest {
  name: string;
  email: string;
  contactType: ContactType;
  message: string;
  /** Honeypot field — must stay empty for legitimate submissions */
  website?: string;
  posthogSessionId?: string;
  posthogDistinctId?: string;
}

/**
 * Contact form submission response
 */
export interface ContactSubmitResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  remaining?: number;
}

/**
 * Submit a contact message (inquiry or feedback)
 * Sends the message to the organizers via /api/contact.
 *
 * @param data - Sender details, contact type, and message
 * @returns Success status and message id
 * @throws ApiError if the request fails
 */
export async function submitContactMessage(
  data: ContactSubmitRequest
): Promise<ContactSubmitResponse> {
  return apiClient.post<ContactSubmitResponse, ContactSubmitRequest>(
    endpoints.contact.submit(),
    data
  );
}
