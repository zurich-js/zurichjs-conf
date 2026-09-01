/**
 * The door audit log, for the organiser view.
 *
 * Fetch-on-demand rather than polled: the log is for reviewing what happened,
 * not for watching it happen — the live dashboard already answers "now".
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/admin/api-fetch';
import { checkinKeys, type DoorEventListParams } from '@/lib/checkin/query-keys';
import type { DoorEventList } from '@/pages/api/admin/checkin/events';

export function useDoorEvents(params: DoorEventListParams) {
  const search = new URLSearchParams();
  if (params.occasion) search.set('occasion', params.occasion);
  if (params.eventType) search.set('eventType', params.eventType);
  if (params.staffId) search.set('staffId', params.staffId);
  if (params.subjectId) search.set('subjectId', params.subjectId);
  search.set('limit', '200');

  return useQuery({
    queryKey: checkinKeys.eventList(params),
    queryFn: ({ signal }) =>
      adminFetch<DoorEventList>(`/api/admin/checkin/events?${search.toString()}`, { signal }),
    staleTime: 15_000,
    placeholderData: (previous) => previous,
  });
}

/**
 * Admin-only removal of audit rows — rehearsal and test data. Invalidate the
 * whole events subtree: every filtered view may contain the deleted rows.
 */
export function useDeleteDoorEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) =>
      adminFetch<{ deleted: number }>('/api/admin/checkin/events', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: checkinKeys.events() });
    },
  });
}
