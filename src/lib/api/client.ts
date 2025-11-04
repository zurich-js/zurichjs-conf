/**
 * Type-safe API client
 * HTTP methods with consistent error handling and type safety
 */

import { buildUrl, defaultApiConfig, type ApiConfig } from './config';

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
 * Base fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, config, ...fetchOptions } = options;
  const apiConfig = { ...defaultApiConfig, ...config };
  
  const url = buildUrlWithParams(endpoint, params);
  
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
    throw new ApiError(
      errorData.error || `Request failed: ${response.statusText}`,
      response.status,
      endpoint,
      errorData
    );
  }

  const data = await response.json();
  return data as T;
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

