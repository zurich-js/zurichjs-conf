/**
 * A volunteer's own actions this shift — the "my check-ins" view.
 *
 * Fetched only while the panel is open (`enabled`), so the station's hot path
 * stays two requests per shift. A short staleTime keeps re-opens cheap while
 * still showing writes that landed since; anything still in the offline queue
 * is by definition not here yet, which the panel says out loud.
 */

import { useQuery } from '@tanstack/react-query';
import { doorFetch } from '@/lib/checkin/api-fetch';
import { checkinKeys } from '@/lib/checkin/query-keys';
import type { DoorMyActivity } from '@/pages/api/checkin/my-activity';
import type { DoorOccasion } from '@/lib/types/checkin';

export function useDoorMyActivity(options: {
  occasion: DoorOccasion | undefined;
  enabled: boolean;
}) {
  const { occasion, enabled } = options;

  return useQuery({
    queryKey: checkinKeys.myActivity(occasion ?? null),
    queryFn: ({ signal }) =>
      doorFetch<DoorMyActivity>(
        `/api/checkin/my-activity?occasion=${encodeURIComponent(occasion ?? '')}`,
        { signal }
      ),
    enabled: enabled && occasion !== undefined,
    staleTime: 15_000,
    placeholderData: (previous) => previous,
  });
}
