/**
 * The station's feedback channel: one signal driving both the beep and the flash.
 *
 * WHY THEY ARE COUPLED IN CODE AND NOT JUST BY CONVENTION
 * iOS has no vibration API, so a volunteer looking at the attendee rather than
 * the phone has exactly two cues. A beep that says "already checked in" over a
 * screen that flashes nothing is worse than no feedback, because it is ambiguous
 * — and that is precisely the bug that appears the moment the two are fired from
 * separate call sites.
 *
 * The nonce exists because a repeat needs to be visible: scanning the same badge
 * twice, or admitting someone after resolving them, must flash again even though
 * the tone has not changed.
 */

import { useCallback, useState } from 'react';
import { signalDoorOutcome, type DoorFeedbackTone } from '@/lib/checkin/feedback';

export interface DoorFeedback {
  tone: DoorFeedbackTone;
  /** Bumped on every signal, so an identical verdict still flashes. */
  nonce: number;
}

export function useDoorFeedback() {
  const [feedback, setFeedback] = useState<DoorFeedback | null>(null);

  /** Play a tone and flash the same verdict. There is no way to do one without the other. */
  const signal = useCallback((tone: DoorFeedbackTone) => {
    signalDoorOutcome(tone);
    setFeedback((previous) => ({ tone, nonce: (previous?.nonce ?? 0) + 1 }));
  }, []);

  const clear = useCallback(() => setFeedback(null), []);

  return { feedback, signal, clear };
}
