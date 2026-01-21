/**
 * CFP Travel Admin API Functions
 */

import type {
  TravelDashboardStats,
  SpeakerWithTravel,
  FlightWithSpeaker,
  ReimbursementWithSpeaker,
} from '@/lib/cfp/admin-travel';

export const travelQueryKeys = {
  all: ['admin', 'travel'] as const,
  stats: ['admin', 'travel', 'stats'] as const,
  speakers: ['admin', 'travel', 'speakers'] as const,
  flights: ['admin', 'travel', 'flights'] as const,
  reimbursements: ['admin', 'travel', 'reimbursements'] as const,
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

export async function fetchFlights(): Promise<FlightWithSpeaker[]> {
  const res = await fetch('/api/admin/cfp/travel/flights');
  if (!res.ok) throw new Error('Failed to fetch flights');
  const data = await res.json();
  return data.flights;
}

export async function fetchReimbursements(): Promise<ReimbursementWithSpeaker[]> {
  const res = await fetch('/api/admin/cfp/travel/reimbursements');
  if (!res.ok) throw new Error('Failed to fetch reimbursements');
  const data = await res.json();
  return data.reimbursements;
}
