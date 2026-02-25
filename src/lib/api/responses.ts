/**
 * Standardized API Response Helpers
 *
 * Provides consistent error and success response shapes across all API routes.
 * Eliminates repeated inline `res.status(N).json({ error: '...' })` patterns.
 *
 * Usage:
 *   import { apiError, apiValidationError } from '@/lib/api/responses';
 *
 *   // Simple error
 *   return apiError(res, 401, 'Unauthorized');
 *
 *   // Zod validation error
 *   const result = schema.safeParse(req.body);
 *   if (!result.success) return apiValidationError(res, result.error);
 */

import type { NextApiResponse } from 'next';
import type { ZodError } from 'zod';

/**
 * Standard API error response shape
 */
interface ApiErrorResponse {
  error: string;
  issues?: Array<{ message: string; path?: (string | number)[] }>;
}

/**
 * Send a standard error response
 */
export function apiError(
  res: NextApiResponse,
  status: number,
  message: string
): void {
  res.status(status).json({ error: message } satisfies ApiErrorResponse);
}

/**
 * Send a Zod validation error response (400)
 */
export function apiValidationError(
  res: NextApiResponse,
  zodError: ZodError
): void {
  res.status(400).json({
    error: 'Validation failed',
    issues: zodError.issues,
  });
}

/**
 * Send a 405 Method Not Allowed response
 */
export function apiMethodNotAllowed(res: NextApiResponse): void {
  res.status(405).json({ error: 'Method not allowed' } satisfies ApiErrorResponse);
}

/**
 * Send a 401 Unauthorized response
 */
export function apiUnauthorized(res: NextApiResponse): void {
  res.status(401).json({ error: 'Unauthorized' } satisfies ApiErrorResponse);
}

/**
 * Send a 500 Internal Server Error response
 */
export function apiServerError(res: NextApiResponse): void {
  res.status(500).json({ error: 'Internal server error' } satisfies ApiErrorResponse);
}
