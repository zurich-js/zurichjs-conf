/**
 * The Help button's network half.
 *
 * A plain mutation, deliberately NOT routed through the offline queue: a help
 * request is only useful while the volunteer is still standing there, so a
 * request that cannot be sent now should say so now rather than land an hour
 * later when the queue drains. The volunteer is told, either way, to find a
 * core team member in person if nobody arrives.
 */

import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { doorFetch } from '@/lib/checkin/api-fetch';
import type { DoorHelpRequestInput } from '@/lib/validations/checkin';
import type { DoorHelpResponse } from '@/pages/api/checkin/help';
import type { DoorHelpNoticeStatus } from '@/components/checkin/DoorHelpNotice';

/** What the volunteer is asking about, as the station knows it. */
export type DoorHelpRequest = Omit<DoorHelpRequestInput, 'fromLookup'> & { fromLookup?: boolean };

export type DoorHelpStatus = 'idle' | DoorHelpNoticeStatus;

export interface UseDoorHelpResult {
  status: DoorHelpStatus;
  /** Short handle from the server, for the volunteer to read out. */
  reference: string | null;
  request: (input: DoorHelpRequest) => void;
  /** Back to idle — the notice was dismissed or the attendee changed. */
  reset: () => void;
}

export function useDoorHelp(): UseDoorHelpResult {
  const mutation = useMutation({
    mutationFn: (input: DoorHelpRequest) =>
      doorFetch<DoorHelpResponse>('/api/checkin/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    // One attempt only: a volunteer with a queue would rather be told to find
    // someone than watch a spinner retry into a dead network.
    retry: false,
  });

  const status: DoorHelpStatus = (() => {
    if (mutation.isPending) return 'sending';
    if (mutation.isError) return 'failed';
    if (mutation.isSuccess) return mutation.data.delivered ? 'sent' : 'undelivered';
    return 'idle';
  })();

  const { mutate, reset } = mutation;
  const request = useCallback((input: DoorHelpRequest) => mutate(input), [mutate]);

  return {
    status,
    reference: mutation.data?.reference ?? null,
    request,
    reset,
  };
}
