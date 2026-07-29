/**
 * Speaker Logistics Admin API
 * Client-side API functions for the speaker logistics reconciliation tab
 */

import type { ActivityGuestFormData } from '@/lib/validations/speaker-logistics';
import type {
  ActivityGuestAdminRow,
  ActivityGuestsResponse,
  SpeakerLogisticsOverviewResponse,
} from './types';

export async function fetchSpeakerLogisticsOverview(): Promise<SpeakerLogisticsOverviewResponse> {
  const res = await fetch('/api/admin/speaker-logistics');
  if (!res.ok) throw new Error('Failed to fetch speaker logistics overview');
  return res.json();
}

export async function fetchActivityGuests(): Promise<ActivityGuestsResponse> {
  const res = await fetch('/api/admin/speaker-logistics/guests');
  if (!res.ok) throw new Error('Failed to fetch activity guests');
  return res.json();
}

export async function createActivityGuest(input: ActivityGuestFormData): Promise<ActivityGuestAdminRow> {
  const res = await fetch('/api/admin/speaker-logistics/guests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || 'Failed to add guest');
  return body.guest;
}

export async function updateActivityGuest(
  id: string,
  input: ActivityGuestFormData
): Promise<ActivityGuestAdminRow> {
  const res = await fetch(`/api/admin/speaker-logistics/guests/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || 'Failed to update guest');
  return body.guest;
}

export async function deleteActivityGuest(id: string): Promise<void> {
  const res = await fetch(`/api/admin/speaker-logistics/guests/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'Failed to remove guest');
  }
}

export const speakerLogisticsQueryKeys = {
  all: ['admin-speaker-logistics'] as const,
  overview: () => [...speakerLogisticsQueryKeys.all, 'overview'] as const,
  guests: () => [...speakerLogisticsQueryKeys.all, 'guests'] as const,
};
