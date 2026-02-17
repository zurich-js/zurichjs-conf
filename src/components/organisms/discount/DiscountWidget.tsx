/**
 * Discount Widget
 *
 * Fixed bottom-right floating widget that appears when the modal is minimized.
 * Shows countdown timer. Click to re-open the modal.
 */

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { padZero } from '@/hooks/useCountdown';
import type { TimeRemaining } from '@/hooks/useCountdown';

interface DiscountWidgetProps {
  countdown: TimeRemaining;
  percentOff: number;
  onReopen: () => void;
}

function formatFriendlyTime(countdown: TimeRemaining): string {
  const parts: string[] = [];
  if (countdown.hours > 0) {
    parts.push(`${countdown.hours} hour${countdown.hours !== 1 ? 's' : ''}`);
  }
  if (countdown.minutes > 0) {
    parts.push(`${countdown.minutes} minute${countdown.minutes !== 1 ? 's' : ''}`);
  }
  parts.push(`${countdown.seconds} second${countdown.seconds !== 1 ? 's' : ''}`);
  return parts.join(' ');
}

function formatCompactTime(countdown: TimeRemaining): string {
  return `${countdown.hours}:${padZero(countdown.minutes)}:${padZero(countdown.seconds)}`;
}

export function DiscountWidget({ countdown, onReopen }: DiscountWidgetProps) {
  const timeStr = formatFriendlyTime(countdown);
  const compactTimeStr = formatCompactTime(countdown);

  return (
    <>
      {/* Desktop widget */}
      <motion.button
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 0 }}
        transition={{ duration: 0.1, ease: 'easeOut' }}
        onClick={onReopen}
        className="fixed bottom-4 right-4 z-40 cursor-pointer
        rounded-2xl overflow-hidden border-2 border-white/40 px-3 py-2 md:px-4 md:py-6 text-left
        shadow-2xl transition-all glass-container hover:border-white/60 md:block"
        aria-label="Reopen discount popup"
      >
        <div className="glass-cover" aria-hidden="true" />
        {/* Top row */}
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm hidden md:block">Your discount is available for another</span>
          <span className="text-xs leading-none md:hidden">Your discount</span>
          <ChevronRight className="h-4 w-4 opacity-40" />
        </div>

        {/* Time */}
        <div className="text-base font-semibold w-[22ch] hidden md:block">{timeStr}</div>
        <div className="text-sm font-semibold md:hidden">{compactTimeStr}</div>
      </motion.button>
    </>
  );
}
