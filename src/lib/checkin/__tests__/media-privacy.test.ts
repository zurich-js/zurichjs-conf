/**
 * The station's media posture: CAMERA ONLY, ever.
 *
 * These tests exist because "the check-in page uses the microphone" is the kind
 * of regression a code review misses — one library swap or one constraints edit
 * away — and the first anyone hears of it is a volunteer asking why their phone
 * shows the mic indicator at the door.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { openDoorCamera } from '../scanner';
import { armDoorAudio, disarmDoorAudio, isDoorAudioArmed } from '../feedback';

afterEach(() => {
  // feedback.ts holds its context in module state; every test leaves it released.
  disarmDoorAudio();
  vi.unstubAllGlobals();
});

describe('openDoorCamera never requests the microphone', () => {
  function stubCamera() {
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [] });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
    return getUserMedia;
  }

  it('asks for video with audio explicitly false', async () => {
    const getUserMedia = stubCamera();
    await openDoorCamera();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: false })
    );
  });

  it('keeps audio false when a specific camera is picked from the switcher', async () => {
    const getUserMedia = stubCamera();
    await openDoorCamera({ deviceId: 'rear-wide' });
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: false,
        video: expect.objectContaining({ deviceId: { exact: 'rear-wide' } }),
      })
    );
  });
});

describe('the beep audio session is released when the shift ends', () => {
  class FakeAudioContext {
    state = 'suspended';
    resumed = 0;
    closed = 0;
    resume(): Promise<void> {
      this.state = 'running';
      this.resumed += 1;
      return Promise.resolve();
    }
    close(): Promise<void> {
      this.state = 'closed';
      this.closed += 1;
      return Promise.resolve();
    }
  }

  it('arms on the start-shift gesture and closes on disarm', () => {
    const instances: FakeAudioContext[] = [];
    vi.stubGlobal('window', {
      AudioContext: class extends FakeAudioContext {
        constructor() {
          super();
          instances.push(this);
        }
      },
    });

    armDoorAudio();
    expect(instances).toHaveLength(1);
    expect(isDoorAudioArmed()).toBe(true);

    // Closing, not suspending: the OS gets its audio session back entirely, so
    // the phone stops listing the page as an audio user after sign-out.
    disarmDoorAudio();
    expect(instances[0].closed).toBe(1);
    expect(isDoorAudioArmed()).toBe(false);

    // A fresh shift gets a fresh context rather than the closed one.
    armDoorAudio();
    expect(instances).toHaveLength(2);
    expect(isDoorAudioArmed()).toBe(true);
  });

  it('is safe to disarm a station that never armed', () => {
    expect(() => disarmDoorAudio()).not.toThrow();
  });
});
