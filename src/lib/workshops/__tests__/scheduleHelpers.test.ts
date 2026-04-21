import { describe, expect, it } from 'vitest';
import { hasScheduleSlot, validateSchedule } from '../scheduleHelpers';

describe('validateSchedule', () => {
  it('accepts empty inputs as all-null', () => {
    const r = validateSchedule({});
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.date).toBeNull();
      expect(r.startTime).toBeNull();
      expect(r.endTime).toBeNull();
      expect(r.durationMinutes).toBeNull();
    }
  });

  it('normalizes HH:MM to HH:MM:00', () => {
    const r = validateSchedule({
      date: '2026-09-10',
      startTime: '09:00',
      endTime: '12:00',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.startTime).toBe('09:00:00');
      expect(r.endTime).toBe('12:00:00');
      expect(r.durationMinutes).toBe(180);
    }
  });

  it('rejects invalid date format', () => {
    const r = validateSchedule({ date: '09/10/2026' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/YYYY-MM-DD/);
  });

  it('rejects invalid time format', () => {
    const r = validateSchedule({ startTime: '9am' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/HH:MM/);
  });

  it('rejects end time before or equal to start time', () => {
    const r = validateSchedule({ startTime: '10:00', endTime: '10:00' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/after/i);

    const r2 = validateSchedule({ startTime: '10:00', endTime: '09:00' });
    expect(r2.ok).toBe(false);
  });

  it('computes durationMinutes only when both times are set', () => {
    const only = validateSchedule({ startTime: '09:00' });
    expect(only.ok).toBe(true);
    if (only.ok) expect(only.durationMinutes).toBeNull();
  });
});

describe('hasScheduleSlot', () => {
  it('returns true only when date + start + end are all non-null', () => {
    expect(
      hasScheduleSlot({
        date: '2026-09-10',
        start_time: '09:00',
        end_time: '12:00',
        duration_minutes: 180,
      })
    ).toBe(true);

    expect(
      hasScheduleSlot({
        date: '2026-09-10',
        start_time: null,
        end_time: '12:00',
        duration_minutes: null,
      })
    ).toBe(false);

    expect(
      hasScheduleSlot({
        date: null,
        start_time: null,
        end_time: null,
        duration_minutes: null,
      })
    ).toBe(false);
  });
});
