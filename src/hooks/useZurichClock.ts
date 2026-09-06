/**
 * useZurichClock — the venue's wall clock, refreshed every half minute.
 *
 * Returns `null` during SSR and the first client render so server and client
 * markup match (no `new Date()` during render); callers treat `null` as
 * "don't know yet" and render the time-neutral version of the page.
 */

import { useEffect, useState } from 'react';
import { getZurichClock } from '@/lib/feedback/schedule-status';
import type { ZurichClock } from '@/lib/feedback/types';

const TICK_MS = 30_000;

export function useZurichClock(): ZurichClock | null {
  const [clock, setClock] = useState<ZurichClock | null>(null);

  useEffect(() => {
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
  }, []);

  return clock;
}
