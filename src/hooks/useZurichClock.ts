/**
 * useZurichClock — the venue's wall clock, refreshed every half minute.
 *
 * Returns `null` during SSR and the first client render so server and client
 * markup match (no `new Date()` during render); callers treat `null` as
 * "don't know yet" and render the time-neutral version of the page.
 *
 * Pass `previewAt` (an ISO instant, see `@/lib/feedback/preview-clock`) to
 * freeze the clock at that moment instead — used to rehearse conference day.
 */

import { useEffect, useState } from 'react';
import { getZurichClock } from '@/lib/feedback/schedule-status';
import type { ZurichClock } from '@/lib/feedback/types';

const TICK_MS = 30_000;

/** Current venue clock, or null before mount. Frozen at `previewAt` when given. */
export function useZurichClock(previewAt: string | null = null): ZurichClock | null {
  const [clock, setClock] = useState<ZurichClock | null>(null);

  useEffect(() => {
    if (previewAt) {
      setClock(getZurichClock(new Date(previewAt)));
      return undefined;
    }
    const tick = () => setClock(getZurichClock(new Date()));
    tick();
    const interval = window.setInterval(tick, TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [previewAt]);

  return clock;
}
