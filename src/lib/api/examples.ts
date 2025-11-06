/**
 * API Client Usage Examples
 * Real-world patterns for using the type-safe API client
 * 
 * NOTE: This file is for documentation purposes only.
 * Copy patterns from here into your actual implementation files.
 */

import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';
import { apiClient, endpoints, ApiError } from './index';

// ============================================================================
// EXAMPLE 1: Basic GET Request with Type Safety
// ============================================================================

interface TicketPlan {
  id: string;
  title: string;
  price: number;
  currency: string;
}

interface TicketPricingResponse {
  plans: TicketPlan[];
  currentStage: string;
}

export async function fetchTicketPricing(): Promise<TicketPricingResponse> {
  // Type-safe GET request with explicit response type
  return apiClient.get<TicketPricingResponse>(
    endpoints.tickets.pricing()
  );
}

// ============================================================================
// EXAMPLE 2: GET Request with Query Parameters
// ============================================================================

interface TicketSearchParams extends Record<string, string | number | boolean | undefined> {
  stage?: 'early_bird' | 'standard' | 'late_bird';
  category?: 'standard_student_unemployed' | 'standard' | 'vip';
  currency?: string;
  limit?: number;
}

export async function searchTickets(
  params: TicketSearchParams
): Promise<TicketPricingResponse> {
  return apiClient.get<TicketPricingResponse>(
    endpoints.tickets.pricing(),
    { params }
  );
  // Results in: /api/tickets/pricing?stage=early_bird&category=vip&currency=CHF
}

// ============================================================================
// EXAMPLE 3: POST Request with Request/Response Types
// ============================================================================

interface PurchaseRequest {
  ticketId: string;
  quantity: number;
  email: string;
  paymentMethodId: string;
}

interface PurchaseResponse {
  orderId: string;
  total: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  paymentIntentId: string;
}

export async function purchaseTickets(
  data: PurchaseRequest
): Promise<PurchaseResponse> {
  // POST with typed request and response
  return apiClient.post<PurchaseResponse, PurchaseRequest>(
    endpoints.tickets.purchase(),
    data
  );
}

// ============================================================================
// EXAMPLE 4: Dynamic Endpoint with Parameters
// ============================================================================

interface TicketDetails extends TicketPlan {
  description: string;
  features: string[];
  availability: number;
}

export async function fetchTicketById(
  ticketId: string
): Promise<TicketDetails> {
  // Dynamic endpoint with parameter
  return apiClient.get<TicketDetails>(
    endpoints.tickets.byId(ticketId)
  );
  // Results in: /api/tickets/{ticketId}
}

// ============================================================================
// EXAMPLE 5: Error Handling with ApiError
// ============================================================================

export async function fetchTicketsWithErrorHandling(): Promise<TicketPricingResponse | null> {
  try {
    return await apiClient.get<TicketPricingResponse>(
      endpoints.tickets.pricing()
    );
  } catch (error) {
    // Type-safe error handling
    if (error instanceof ApiError) {
      console.error(`API Error ${error.statusCode}: ${error.message}`);
      console.error(`Endpoint: ${error.endpoint}`);
      
      // Handle specific status codes
      if (error.statusCode === 404) {
        console.error('Ticket pricing not found');
      } else if (error.statusCode === 500) {
        console.error('Server error fetching tickets');
      }
      
      // Access error data if available
      if (error.data) {
        console.error('Error details:', error.data);
      }
    } else {
      console.error('Unexpected error:', error);
    }
    return null;
  }
}

// ============================================================================
// EXAMPLE 6: TanStack Query Integration - Query Options
// ============================================================================

// Query options factory for pricing
export const ticketPricingQueryOptions = queryOptions({
  queryKey: ['tickets', 'pricing'],
  queryFn: () => apiClient.get<TicketPricingResponse>(
    endpoints.tickets.pricing()
  ),
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000,   // 10 minutes
});

// Query options factory with parameters
export const ticketByIdQueryOptions = (ticketId: string) => queryOptions({
  queryKey: ['tickets', ticketId],
  queryFn: () => apiClient.get<TicketDetails>(
    endpoints.tickets.byId(ticketId)
  ),
  staleTime: 5 * 60 * 1000,
  enabled: !!ticketId, // Only run if ticketId exists
});

// ============================================================================
// EXAMPLE 7: TanStack Query Hook Usage
// ============================================================================

export function useTicketPricing() {
  const { data, isLoading, error, refetch } = useQuery(
    ticketPricingQueryOptions
  );

  return {
    plans: data?.plans ?? [],
    currentStage: data?.currentStage ?? null,
    isLoading,
    error: error?.message ?? null,
    refetch,
  };
}

export function useTicketById(ticketId: string) {
  return useQuery(ticketByIdQueryOptions(ticketId));
}

// ============================================================================
// EXAMPLE 8: TanStack Query Mutation
// ============================================================================

export function useTicketPurchase() {
  return useMutation({
    mutationFn: (data: PurchaseRequest) =>
      apiClient.post<PurchaseResponse, PurchaseRequest>(
        endpoints.tickets.purchase(),
        data
      ),
    onSuccess: (response) => {
      console.log('Purchase successful:', response.orderId);
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        console.error(`Purchase failed: ${error.message}`);
      }
    },
  });
}

// Usage in component:
// const { mutate, isPending } = useTicketPurchase();
// mutate({ ticketId: 'vip', quantity: 2, email: 'user@example.com', paymentMethodId: 'pm_123' });

// ============================================================================
// EXAMPLE 9: Custom Configuration per Request
// ============================================================================

export async function fetchTicketsWithCustomConfig(): Promise<TicketPricingResponse> {
  return apiClient.get<TicketPricingResponse>(
    endpoints.tickets.pricing(),
    {
      config: {
        timeout: 60000, // 60 seconds
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'value',
        },
      },
    }
  );
}

// ============================================================================
// EXAMPLE 10: Request Cancellation with AbortController
// ============================================================================

export async function fetchTicketsWithCancellation(
  signal: AbortSignal
): Promise<TicketPricingResponse> {
  return apiClient.get<TicketPricingResponse>(
    endpoints.tickets.pricing(),
    { signal }
  );
}

// Usage:
// const controller = new AbortController();
// const promise = fetchTicketsWithCancellation(controller.signal);
// controller.abort(); // Cancel the request

// ============================================================================
// EXAMPLE 11: Parallel Requests
// ============================================================================

export async function fetchAllTicketData(): Promise<{
  pricing: TicketPricingResponse;
  studentUnemployed: TicketDetails;
  vip: TicketDetails;
}> {
  // Execute multiple requests in parallel
  const [pricing, studentUnemployed, vip] = await Promise.all([
    apiClient.get<TicketPricingResponse>(endpoints.tickets.pricing()),
    apiClient.get<TicketDetails>(endpoints.tickets.byId('standard_student_unemployed')),
    apiClient.get<TicketDetails>(endpoints.tickets.byId('vip')),
  ]);

  return { pricing, studentUnemployed, vip };
}

// ============================================================================
// EXAMPLE 12: Conditional Requests
// ============================================================================

export async function fetchTicketPricingConditional(
  shouldFetch: boolean
): Promise<TicketPricingResponse | null> {
  if (!shouldFetch) {
    return null;
  }

  return apiClient.get<TicketPricingResponse>(
    endpoints.tickets.pricing()
  );
}

// ============================================================================
// EXAMPLE 13: PUT Request (Update)
// ============================================================================

interface UpdateTicketRequest {
  price: number;
  availability: number;
}

export async function updateTicket(
  ticketId: string,
  updates: UpdateTicketRequest
): Promise<TicketDetails> {
  return apiClient.put<TicketDetails, UpdateTicketRequest>(
    endpoints.tickets.byId(ticketId),
    updates
  );
}

// ============================================================================
// EXAMPLE 14: PATCH Request (Partial Update)
// ============================================================================

interface PartialTicketUpdate {
  price?: number;
  availability?: number;
}

export async function partialUpdateTicket(
  ticketId: string,
  updates: PartialTicketUpdate
): Promise<TicketDetails> {
  return apiClient.patch<TicketDetails, PartialTicketUpdate>(
    endpoints.tickets.byId(ticketId),
    updates
  );
}

// ============================================================================
// EXAMPLE 15: DELETE Request
// ============================================================================

interface DeleteResponse {
  success: boolean;
  message: string;
}

export async function deleteTicket(ticketId: string): Promise<DeleteResponse> {
  return apiClient.delete<DeleteResponse>(
    endpoints.tickets.byId(ticketId)
  );
}

// ============================================================================
// EXAMPLE 16: Complex Query with Multiple Parameters
// ============================================================================

interface SearchFilters extends Record<string, string | number | boolean | undefined> {
  minPrice?: number;
  maxPrice?: number;
  stage?: string;
  category?: string;
  available?: boolean;
  sortBy?: 'price' | 'name' | 'popularity';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function searchTicketsAdvanced(
  filters: SearchFilters
): Promise<PaginatedResponse<TicketPlan>> {
  return apiClient.get<PaginatedResponse<TicketPlan>>(
    endpoints.tickets.pricing(),
    { params: filters }
  );
  // Results in: /api/tickets/pricing?minPrice=100&maxPrice=500&stage=early_bird&sortBy=price&order=asc&page=1&limit=20
}

// ============================================================================
// EXAMPLE 17: Retry Logic
// ============================================================================

export async function fetchWithRetry(
  maxRetries: number = 3
): Promise<TicketPricingResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiClient.get<TicketPricingResponse>(
        endpoints.tickets.pricing()
      );
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors (4xx)
      if (error instanceof ApiError && error.statusCode < 500) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError;
}

// ============================================================================
// EXAMPLE 18: Response Transformation
// ============================================================================

interface RawTicketResponse {
  plans: Array<{
    id: string;
    name: string;
    price_cents: number;
    currency_code: string;
  }>;
}

interface TransformedTicket {
  id: string;
  title: string;
  price: number; // In currency units, not cents
  currency: string;
}

export async function fetchAndTransformTickets(): Promise<TransformedTicket[]> {
  const response = await apiClient.get<RawTicketResponse>(
    endpoints.tickets.pricing()
  );

  // Transform the response
  return response.plans.map(plan => ({
    id: plan.id,
    title: plan.name,
    price: plan.price_cents / 100, // Convert cents to currency units
    currency: plan.currency_code.toUpperCase(),
  }));
}

// ============================================================================
// EXAMPLE 19: Dependent Queries
// ============================================================================

export async function fetchTicketWithPurchaseHistory(
  ticketId: string
): Promise<{
  ticket: TicketDetails;
  purchaseCount: number;
}> {
  // First, fetch the ticket
  const ticket = await apiClient.get<TicketDetails>(
    endpoints.tickets.byId(ticketId)
  );

  // Then, fetch purchase history (dependent on ticket data)
  // Note: This assumes you have this endpoint defined
  // const history = await apiClient.get<PurchaseHistory>(
  //   endpoints.tickets.purchaseHistory(ticket.id)
  // );

  return {
    ticket,
    purchaseCount: 0, // Replace with actual count from history
  };
}

// ============================================================================
// EXAMPLE 20: Type Guards for Response Validation
// ============================================================================

function isValidTicketResponse(data: unknown): data is TicketPricingResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'plans' in data &&
    Array.isArray((data as TicketPricingResponse).plans) &&
    'currentStage' in data &&
    typeof (data as TicketPricingResponse).currentStage === 'string'
  );
}

export async function fetchTicketsWithValidation(): Promise<TicketPricingResponse> {
  const data = await apiClient.get<unknown>(
    endpoints.tickets.pricing()
  );

  if (!isValidTicketResponse(data)) {
    throw new Error('Invalid response format from API');
  }

  return data;
}

