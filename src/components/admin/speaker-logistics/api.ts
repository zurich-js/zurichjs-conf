/**
 * Speaker Logistics Admin API
 * Client-side API functions for the speaker logistics reconciliation tab
 */

import type {
  SpeakerLogisticsOverviewResponse,
  SendSpeakerLogisticsRequestsResponse,
} from './types';

const SEND_BATCH_SIZE = 200; // matches the API's max speakerIds per request

export async function fetchSpeakerLogisticsOverview(): Promise<SpeakerLogisticsOverviewResponse> {
  const res = await fetch('/api/admin/speaker-logistics');
  if (!res.ok) throw new Error('Failed to fetch speaker logistics overview');
  return res.json();
}

export async function sendSpeakerLogisticsRequestsApi(
  speakerIds: string[],
  customMessage?: string
): Promise<SendSpeakerLogisticsRequestsResponse> {
  const totals: SendSpeakerLogisticsRequestsResponse = {
    success: true,
    requested: 0,
    sent: 0,
    failed: 0,
    failures: [],
  };

  for (let i = 0; i < speakerIds.length; i += SEND_BATCH_SIZE) {
    const batch = speakerIds.slice(i, i + SEND_BATCH_SIZE);
    const res = await fetch('/api/admin/speaker-logistics/remind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speakerIds: batch, customMessage }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to send speaker logistics requests');
    }
    const result: SendSpeakerLogisticsRequestsResponse = await res.json();
    totals.requested += result.requested;
    totals.sent += result.sent;
    totals.failed += result.failed;
    totals.failures.push(...result.failures);
  }

  return totals;
}

export const speakerLogisticsQueryKeys = {
  all: ['admin-speaker-logistics'] as const,
  overview: () => [...speakerLogisticsQueryKeys.all, 'overview'] as const,
};
