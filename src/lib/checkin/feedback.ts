/**
 * Scan feedback for the door station.
 *
 * WHY SOUND AND COLOUR, NOT VIBRATION
 * navigator.vibrate does not exist on iOS at all — browser-compat-data reports
 * version_added: false for both safari and safari_ios. Since volunteers are on
 * personal phones, haptics are unavailable to most of the crew, so feedback has
 * to lead with a full-viewport colour flash and a pitch-differentiated beep.
 *
 * Pitch carries the meaning: a volunteer looking at the attendee rather than the
 * screen still hears the difference between "admitted" and "stop".
 *
 * THE MICROPHONE IS NEVER TOUCHED. The beep is a pure OUTPUT oscillator; no
 * code here (or anywhere at the door — the camera opens with `audio: false`)
 * captures audio, and /checkin ships a Permissions-Policy header that denies
 * the microphone outright. The context is also CLOSED when the shift ends
 * (`disarmDoorAudio`): a page holding a live AudioContext keeps an OS audio
 * session open, which on iOS is exactly what makes a station look like it is
 * "using the mic" and duck other audio long after the volunteer signed out.
 */

export type DoorFeedbackTone = 'success' | 'duplicate' | 'refused';

/** Frequency and duration per tone. Distinct enough to tell apart in a noisy foyer. */
const TONES: Record<DoorFeedbackTone, { steps: number[]; duration: number }> = {
  // Rising two-note chirp — unmistakably "go".
  success: { steps: [880, 1175], duration: 0.09 },
  // Flat single note — "already done", not an error.
  duplicate: { steps: [660], duration: 0.16 },
  // Falling low tone — "stop and look".
  refused: { steps: [400, 260], duration: 0.18 },
};

let audioContext: AudioContext | null = null;

type AudioContextCtor = new () => AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/**
 * Create and unlock the AudioContext.
 *
 * MUST be called from inside a real user gesture — iOS starts every context
 * suspended and only a gesture may resume it. The station calls this from the
 * "start shift" tap, which is also when camera permission is requested, so both
 * unlocks happen on the same deliberate action.
 */
export function armDoorAudio(): void {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return;

  try {
    audioContext ??= new Ctor();
    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }
  } catch {
    // No audio is a degraded but workable station: the colour flash still fires.
    audioContext = null;
  }
}

/** Whether audio is unlocked, so the UI can prompt if it is not. */
export function isDoorAudioArmed(): boolean {
  return audioContext !== null && audioContext.state === 'running';
}

/**
 * Release the audio session when the shift ends.
 *
 * Closing (not merely suspending) hands the OS its audio session back, so the
 * phone stops showing the page as an audio user the moment the volunteer signs
 * out or leaves the station. Re-arming after this simply creates a fresh
 * context on the next "start shift" tap.
 */
export function disarmDoorAudio(): void {
  const context = audioContext;
  if (!context) return;

  // Nulled first, so a re-arm during the async close never grabs a context
  // that is already on its way down.
  audioContext = null;
  // Handle the Promise rejection explicitly: close() rejects with
  // InvalidStateError when the context is already closed.
  context.close().catch(() => {
    // Already closed, or a browser that refuses — either way it is not ours
    // any more.
  });
}

/**
 * Play the tone for an outcome.
 *
 * Never throws and never awaits: feedback must not be able to delay or fail a
 * check-in. A station with audio blocked still shows the flash.
 */
export function playDoorTone(tone: DoorFeedbackTone): void {
  if (!audioContext || audioContext.state !== 'running') return;

  const { steps, duration } = TONES[tone];
  const ctx = audioContext;

  try {
    steps.forEach((frequency, index) => {
      const startAt = ctx.currentTime + index * duration;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, startAt);

      // Short attack and release, so a burst of scans does not turn into a drone.
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.22, startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration);
    });
  } catch {
    // Ignore — audio is a nicety, the flash is the guarantee.
  }
}

/**
 * Vibrate as well, where the platform supports it.
 *
 * Android only in practice. Kept separate from the tone so the iOS path never
 * looks like a missing feature.
 */
export function vibrateIfSupported(tone: DoorFeedbackTone): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;

  const pattern = tone === 'success' ? 40 : tone === 'duplicate' ? [30, 40, 30] : [80, 60, 80];
  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore.
  }
}

/** Fire every feedback channel available for an outcome. */
export function signalDoorOutcome(tone: DoorFeedbackTone): void {
  playDoorTone(tone);
  vibrateIfSupported(tone);
}
