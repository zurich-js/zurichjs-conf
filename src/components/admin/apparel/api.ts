/**
 * Apparel Admin API
 * Client-side API functions for the apparel overview tab
 */

import type { ApparelOverviewResponse, SendApparelRemindersResponse } from './types';

const REMIND_BATCH_SIZE = 200; // matches the API's max ticketIds per request

export async function fetchApparelOverview(): Promise<ApparelOverviewResponse> {
  const res = await fetch('/api/admin/apparel');
  if (!res.ok) throw new Error('Failed to fetch apparel overview');
  return res.json();
}

export async function sendApparelRemindersApi(
  ticketIds: string[],
  customMessage?: string
): Promise<SendApparelRemindersResponse> {
  const totals: SendApparelRemindersResponse = {
    success: true,
    requested: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    failures: [],
  };

  for (let i = 0; i < ticketIds.length; i += REMIND_BATCH_SIZE) {
    const batch = ticketIds.slice(i, i + REMIND_BATCH_SIZE);
    const res = await fetch('/api/admin/apparel/remind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketIds: batch, customMessage }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to send apparel reminders');
    }
    const result: SendApparelRemindersResponse = await res.json();
    totals.requested += result.requested;
    totals.sent += result.sent;
    totals.failed += result.failed;
    totals.skipped += result.skipped;
    totals.failures.push(...result.failures);
  }

  return totals;
}

export const apparelQueryKeys = {
  all: ['admin-apparel'] as const,
  overview: () => [...apparelQueryKeys.all, 'overview'] as const,
};
