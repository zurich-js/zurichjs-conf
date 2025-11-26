/**
 * Newsletter API Client
 * Type-safe functions for newsletter subscription
 */

import { apiClient, endpoints } from './index';

/**
 * Newsletter subscription request
 */
export interface NewsletterSubscribeRequest {
  email: string;
  source?: 'footer' | 'popup' | 'checkout' | 'other';
}

/**
 * Newsletter subscription response
 */
export interface NewsletterSubscribeResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Subscribe to newsletter
 * Adds the email to the Resend audience for newsletter updates
 *
 * @param data - Email and subscription source
 * @returns Success status and message
 * @throws ApiError if the request fails
 *
 * @example
 * ```ts
 * try {
 *   const result = await subscribeToNewsletter({
 *     email: 'user@example.com',
 *     source: 'footer'
 *   });
 *   console.log('Subscribed:', result.message);
 * } catch (error) {
 *   if (error instanceof ApiError) {
 *     console.error('Subscription failed:', error.message);
 *   }
 * }
 * ```
 */
export async function subscribeToNewsletter(
  data: NewsletterSubscribeRequest
): Promise<NewsletterSubscribeResponse> {
  return apiClient.post<NewsletterSubscribeResponse, NewsletterSubscribeRequest>(
    endpoints.newsletter.subscribe(),
    data
  );
}
