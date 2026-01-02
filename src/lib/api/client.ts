/**
 * Type-safe API client
 * HTTP methods with consistent error handling and type safety
 */

import { buildUrl, defaultApiConfig, type ApiConfig } from './config';
import { captureException } from '@/lib/analytics/helpers';

/**
 * API error class with structured error information
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Request options for API calls
 */
export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  config?: Partial<ApiConfig>;
  /** Skip error capturing for this request (default: false) */
  skipErrorCapture?: boolean;
}

/**
 * Build URL with query parameters
 * Filters out undefined values automatically
 */
function buildUrlWithParams(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = buildUrl(endpoint);
  
  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    // Filter out undefined values
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  return `${url}?${searchParams.toString()}`;
}

/**
 * Get severity based on HTTP status code
 */
function getSeverityFromStatus(status: number): 'low' | 'medium' | 'high' | 'critical' {
  if (status >= 500) return 'high';
  if (status === 401 || status === 403) return 'medium';
  if (status === 429) return 'medium'; // Rate limiting
  return 'low';
}

/**
 * Base fetch wrapper with error handling and automatic error capturing
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, config, skipErrorCapture, ...fetchOptions } = options;
  const apiConfig = { ...defaultApiConfig, ...config };

  const url = buildUrlWithParams(endpoint, params);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...apiConfig.headers,
        ...fetchOptions.headers,
      },
      signal: fetchOptions.signal ?? AbortSignal.timeout(apiConfig.timeout),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const apiError = new ApiError(
        errorData.error || `Request failed: ${response.statusText}`,
        response.status,
        endpoint,
        errorData
      );

      // Capture the error to PostHog unless explicitly skipped
      if (!skipErrorCapture) {
        captureException(apiError, {
          type: 'network',
          severity: getSeverityFromStatus(response.status),
          code: `HTTP_${response.status}`,
          flow: 'api_request',
          action: fetchOptions.method || 'GET',
          context: {
            endpoint,
            status: response.status,
            statusText: response.statusText,
          },
        });
      }

      throw apiError;
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    // Capture non-HTTP errors (network errors, timeouts, etc.)
    if (!(error instanceof ApiError) && !skipErrorCapture) {
      captureException(error, {
        type: 'network',
        severity: 'high',
        flow: 'api_request',
        action: fetchOptions.method || 'GET',
        context: {
          endpoint,
          error_type: error instanceof Error ? error.name : 'unknown',
        },
      });
    }
    throw error;
  }
}

/**
 * HTTP GET request
 */
export async function get<T>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> {
  return fetchApi<T>(endpoint, {
    ...options,
    method: 'GET',
  });
}

/**
 * HTTP POST request
 */
export async function post<T, D = unknown>(
  endpoint: string,
  data?: D,
  options?: RequestOptions
): Promise<T> {
  return fetchApi<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * HTTP PUT request
 */
export async function put<T, D = unknown>(
  endpoint: string,
  data?: D,
  options?: RequestOptions
): Promise<T> {
  return fetchApi<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * HTTP PATCH request
 */
export async function patch<T, D = unknown>(
  endpoint: string,
  data?: D,
  options?: RequestOptions
): Promise<T> {
  return fetchApi<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * HTTP DELETE request
 */
export async function del<T>(
  endpoint: string,
  options?: RequestOptions
): Promise<T> {
  return fetchApi<T>(endpoint, {
    ...options,
    method: 'DELETE',
  });
}

/**
 * Export all HTTP methods as default client
 */
export const apiClient = {
  get,
  post,
  put,
  patch,
  delete: del,
} as const;

