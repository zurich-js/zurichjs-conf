/**
 * CFP Travel Admin API Functions
 * Centralized fetch functions for TanStack Query
 */

import type {
  TravelDashboardStats,
  SpeakerWithTravel,
  FlightWithSpeaker,
  InvoiceWithSpeaker,
} from '@/lib/cfp/admin-travel';
import type { CfpFlightStatus } from '@/lib/types/cfp';

// ============================================================================
// Query Keys
// ============================================================================

export const travelQueryKeys = {
  all: ['admin', 'travel'] as const,
  stats: ['admin', 'travel', 'stats'] as const,
  speakers: ['admin', 'travel', 'speakers'] as const,
  speaker: (id: string) => ['admin', 'travel', 'speaker', id] as const,
  flights: ['admin', 'travel', 'flights'] as const,
  invoices: ['admin', 'travel', 'invoices'] as const,
};

// ============================================================================
// Helpers
// ============================================================================

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function jsonPost<T>(url: string, data: unknown): Promise<T> {
  return jsonFetch<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

function jsonPut<T>(url: string, data: unknown): Promise<T> {
  return jsonFetch<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

function jsonDelete<T>(url: string): Promise<T> {
  return jsonFetch<T>(url, { method: 'DELETE' });
}

// ============================================================================
// Query Functions
// ============================================================================

export async function fetchTravelStats(): Promise<TravelDashboardStats> {
  return jsonFetch('/api/admin/cfp/travel/stats');
}

export async function fetchSpeakers(): Promise<SpeakerWithTravel[]> {
  const data = await jsonFetch<{ speakers: SpeakerWithTravel[] }>('/api/admin/cfp/travel/speakers');
  return data.speakers;
}

export async function fetchSpeakerDetails(speakerId: string): Promise<SpeakerWithTravel> {
  const data = await jsonFetch<{ speaker: SpeakerWithTravel }>(`/api/admin/cfp/travel/speakers/${speakerId}`);
  return data.speaker;
}

export async function fetchFlights(): Promise<FlightWithSpeaker[]> {
  const data = await jsonFetch<{ flights: FlightWithSpeaker[] }>('/api/admin/cfp/travel/flights');
  return data.flights;
}

export async function fetchInvoices(): Promise<InvoiceWithSpeaker[]> {
  const data = await jsonFetch<{ invoices: InvoiceWithSpeaker[] }>('/api/admin/cfp/travel/invoices');
  return data.invoices;
}

// ============================================================================
// Flight Mutations
// ============================================================================

export function createFlight(speakerId: string, data: Record<string, unknown>) {
  return jsonPost('/api/admin/cfp/travel/flights', { speaker_id: speakerId, ...data });
}

export function updateFlight(flightId: string, data: Record<string, unknown>) {
  return jsonPut(`/api/admin/cfp/travel/flights/${flightId}`, data);
}

export function deleteFlight(flightId: string) {
  return jsonDelete(`/api/admin/cfp/travel/flights/${flightId}`);
}

export function updateFlightStatus(flightId: string, status: CfpFlightStatus) {
  return jsonPut(`/api/admin/cfp/travel/flights/${flightId}/status`, { status });
}

// ============================================================================
// Accommodation Mutations
// ============================================================================

export function saveAccommodation(speakerId: string, data: Record<string, unknown>) {
  return jsonPut(`/api/admin/cfp/travel/speakers/${speakerId}/accommodation`, data);
}

// ============================================================================
// Speaker Travel Mutations
// ============================================================================

export function updateSpeakerTravel(speakerId: string, data: Record<string, unknown>) {
  return jsonPut(`/api/admin/cfp/travel/speakers/${speakerId}/travel`, data);
}

// ============================================================================
// Invoice Mutations
// ============================================================================

export function createInvoice(data: Record<string, unknown>) {
  return jsonPost<{ invoice: { id: string } }>('/api/admin/cfp/travel/invoices', data);
}

export function updateInvoice(invoiceId: string, data: Record<string, unknown>) {
  return jsonPut(`/api/admin/cfp/travel/invoices/${invoiceId}`, data);
}

export function deleteInvoice(invoiceId: string) {
  return jsonDelete(`/api/admin/cfp/travel/invoices/${invoiceId}`);
}

export async function uploadInvoicePdf(invoiceId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return jsonFetch(`/api/admin/cfp/travel/invoices/${invoiceId}/upload`, {
    method: 'POST',
    body: formData,
  });
}
