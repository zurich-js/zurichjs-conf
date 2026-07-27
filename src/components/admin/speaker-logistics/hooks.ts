/**
 * Speaker Logistics Admin Hooks
 * TanStack Query hooks for the speaker logistics reconciliation tab
 */

import { useQuery } from '@tanstack/react-query';
import { fetchSpeakerLogisticsOverview, speakerLogisticsQueryKeys } from './api';

export function useSpeakerLogisticsOverview(enabled: boolean = true) {
  return useQuery({
    queryKey: speakerLogisticsQueryKeys.overview(),
    queryFn: fetchSpeakerLogisticsOverview,
    enabled,
  });
}
