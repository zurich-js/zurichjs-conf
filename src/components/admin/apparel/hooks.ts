/**
 * Apparel Admin Hooks
 * TanStack Query hooks for the apparel overview tab
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/contexts/ToastContext';
import { adminKeys } from '@/lib/admin/query-keys';
import { fetchApparelOverview, sendApparelRemindersApi } from './api';
import type { SendApparelRemindersResponse } from './types';

export function useApparelOverview() {
  return useQuery({
    queryKey: adminKeys.apparelOverview(),
    queryFn: fetchApparelOverview,
  });
}

export function useSendApparelReminders() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ ticketIds, customMessage }: { ticketIds: string[]; customMessage?: string }) =>
      sendApparelRemindersApi(ticketIds, customMessage),
    onSuccess: (result: SendApparelRemindersResponse) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.apparelOverview() });
      if (result.failed > 0) {
        toast.error(
          'Reminders Partially Sent',
          `${result.sent} sent, ${result.failed} failed, ${result.skipped} already complete`
        );
      } else if (result.sent === 0) {
        toast.info('Nothing To Send', 'All selected ticket holders already provided their sizes');
      } else {
        toast.success(
          'Reminders Sent',
          `${result.sent} email(s) sent${result.skipped > 0 ? `, ${result.skipped} skipped (already complete)` : ''}`
        );
      }
    },
    onError: (error: Error) => {
      toast.error('Error', error.message);
    },
  });
}
