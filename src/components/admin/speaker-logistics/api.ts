/**
 * Speaker Logistics Admin API
 * Client-side API functions for the speaker logistics reconciliation tab
 */

import type { SpeakerLogisticsOverviewResponse } from './types';

export async function fetchSpeakerLogisticsOverview(): Promise<SpeakerLogisticsOverviewResponse> {
  const res = await fetch('/api/admin/speaker-logistics');
  if (!res.ok) throw new Error('Failed to fetch speaker logistics overview');
  return res.json();
}

export const speakerLogisticsQueryKeys = {
  all: ['admin-speaker-logistics'] as const,
  overview: () => [...speakerLogisticsQueryKeys.all, 'overview'] as const,
};
