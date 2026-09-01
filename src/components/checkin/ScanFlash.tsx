import React, { useEffect, useState } from 'react';
import { useMotion } from '@/contexts/MotionContext';
import type { DoorFeedbackTone } from '@/lib/checkin/feedback';

export interface ScanFlashProps {
  /** Bumped on every scan so repeat scans of the same code still flash. */
  nonce: number;
  tone: DoorFeedbackTone | null;
  className?: string;
}

const TONE_COLOURS: Record<DoorFeedbackTone, string> = {
  success: 'bg-success',
  duplicate: 'bg-warning',
  refused: 'bg-error',
};

const FLASH_MS = 260;

/**
 * A full-viewport colour wash on each scan.
 *
 * This is the primary feedback channel, not a decoration. iOS has no vibration
 * API, so a volunteer who is looking at the attendee rather than the screen gets
 * the tone from `signalDoorOutcome` and this flash in peripheral vision — nothing
 * else tells them the scan landed.
 *
 * Keyed on a nonce rather than the tone so scanning the same code twice in a row
 * still flashes. Respects prefers-reduced-motion by holding a static tint for the
 * same duration instead of animating opacity.
 */
export const ScanFlash: React.FC<ScanFlashProps> = ({ nonce, tone, className = '' }) => {
  const { shouldAnimate } = useMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!tone || nonce === 0) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), FLASH_MS);
    return () => clearTimeout(timer);
  }, [nonce, tone]);

  if (!tone) return null;

  return (
    <div
      // Decorative: the verdict is announced by DoorStateBanner's live region,
      // so this must not be read out a second time.
      aria-hidden="true"
      className={[
        'pointer-events-none fixed inset-0 z-50',
        TONE_COLOURS[tone],
        shouldAnimate ? 'transition-opacity duration-200 ease-out' : '',
        visible ? 'opacity-40' : 'opacity-0',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
};
