/**
 * CFP Travel Admin API Functions
 */

import type {
  TravelDashboardStats,
  SpeakerWithTravel,
  FlightWithSpeaker,
  InvoiceWithSpeaker,
} from '@/lib/cfp/admin-travel';

export const travelQueryKeys = {
  all: ['admin', 'travel'] as const,
  stats: ['admin', 'travel', 'stats'] as const,
  speakers: ['admin', 'travel', 'speakers'] as const,
  speaker: (id: string) => ['admin', 'travel', 'speaker', id] as const,
  flights: ['admin', 'travel', 'flights'] as const,
  invoices: ['admin', 'travel', 'invoices'] as const,
};

export async function fetchTravelStats(): Promise<TravelDashboardStats> {
  const res = await fetch('/api/admin/cfp/travel/stats');
  if (!res.ok) throw new Error('Failed to fetch travel stats');
  return res.json();
}

export async function fetchSpeakers(): Promise<SpeakerWithTravel[]> {
  const res = await fetch('/api/admin/cfp/travel/speakers');
  if (!res.ok) throw new Error('Failed to fetch speakers');
  const data = await res.json();
  return data.speakers;
}

export async function fetchSpeakerDetails(speakerId: string): Promise<SpeakerWithTravel> {
  const res = await fetch(`/api/admin/cfp/travel/speakers/${speakerId}`);
  if (!res.ok) throw new Error('Failed to fetch speaker details');
  const data = await res.json();
  return data.speaker;
}

export async function fetchFlights(): Promise<FlightWithSpeaker[]> {
  const res = await fetch('/api/admin/cfp/travel/flights');
  if (!res.ok) throw new Error('Failed to fetch flights');
  const data = await res.json();
  return data.flights;
}

export async function fetchInvoices(): Promise<InvoiceWithSpeaker[]> {
  const res = await fetch('/api/admin/cfp/travel/invoices');
  if (!res.ok) throw new Error('Failed to fetch invoices');
  const data = await res.json();
  return data.invoices;
}
