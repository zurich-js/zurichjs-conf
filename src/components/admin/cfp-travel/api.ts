/**
 * CFP Travel Admin API Functions
 */

import type {
  TravelDashboardStats,
  SpeakerWithTravel,
  TransportWithSpeaker,
  ReimbursementWithSpeaker,
} from '@/lib/cfp/admin-travel';

export const travelQueryKeys = {
  all: ['admin', 'travel'] as const,
  stats: ['admin', 'travel', 'stats'] as const,
  speakers: ['admin', 'travel', 'speakers'] as const,
  transportation: ['admin', 'travel', 'transportation'] as const,
  reimbursements: ['admin', 'travel', 'reimbursements'] as const,
};

export async function fetchTravelStats(): Promise<TravelDashboardStats> {
  const res = await fetch('/api/admin/cfp/travel/stats', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch travel stats');
  return res.json();
}

export async function fetchSpeakers(): Promise<SpeakerWithTravel[]> {
  const res = await fetch('/api/admin/cfp/travel/speakers', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch speakers');
  const data = await res.json();
  return data.speakers;
}

export async function fetchTransportation(): Promise<TransportWithSpeaker[]> {
  const res = await fetch('/api/admin/cfp/travel/flights', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch transportation');
  const data = await res.json();
  return data.flights;
}

export async function fetchReimbursements(): Promise<ReimbursementWithSpeaker[]> {
  const res = await fetch('/api/admin/cfp/travel/reimbursements', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch reimbursements');
  const data = await res.json();
  return data.reimbursements;
}
