import { describe, it, expect } from 'vitest';
import {
  CONFERENCE_DAY_DATE,
  FEEDBACK_CLOSE_DATE,
  addDays,
  getScheduleItemStatus,
  getZurichClock,
  isEventDay,
  isFeedbackOpen,
  parseClockMinutes,
  resolveDefaultScheduleDay,
} from '../schedule-status';

const talk = { date: '2026-09-11', start_time: '09:00:00', duration_minutes: 45 };

describe('getZurichClock', () => {
  it('projects a UTC instant onto the venue wall clock (CEST = UTC+2 in September)', () => {
    expect(getZurichClock(new Date('2026-09-11T07:14:00.000Z'))).toEqual({ date: '2026-09-11', minutesOfDay: 9 * 60 + 14 });
  });

  it('rolls the date over at venue midnight, not UTC midnight', () => {
    expect(getZurichClock(new Date('2026-09-10T22:30:00.000Z'))).toEqual({ date: '2026-09-11', minutesOfDay: 30 });
  });

  it('never reports hour 24', () => {
    expect(getZurichClock(new Date('2026-09-10T22:00:00.000Z')).minutesOfDay).toBe(0);
  });
});

describe('parseClockMinutes / addDays', () => {
  it('reads HH:MM and HH:MM:SS', () => {
    expect(parseClockMinutes('09:30')).toBe(570);
    expect(parseClockMinutes('13:05:00')).toBe(785);
    expect(parseClockMinutes('garbage')).toBe(0);
  });

  it('adds days across a month boundary', () => {
    expect(addDays('2026-09-29', 3)).toBe('2026-10-02');
  });
});

describe('getScheduleItemStatus', () => {
  it('is upcoming before the start, live during, past after', () => {
    expect(getScheduleItemStatus(talk, { date: '2026-09-11', minutesOfDay: 8 * 60 + 59 })).toBe('upcoming');
    expect(getScheduleItemStatus(talk, { date: '2026-09-11', minutesOfDay: 9 * 60 })).toBe('live');
    expect(getScheduleItemStatus(talk, { date: '2026-09-11', minutesOfDay: 9 * 60 + 44 })).toBe('live');
    expect(getScheduleItemStatus(talk, { date: '2026-09-11', minutesOfDay: 9 * 60 + 45 })).toBe('past');
  });

  it('uses the date before the time of day', () => {
    expect(getScheduleItemStatus(talk, { date: '2026-09-10', minutesOfDay: 23 * 60 })).toBe('upcoming');
    expect(getScheduleItemStatus(talk, { date: '2026-09-12', minutesOfDay: 0 })).toBe('past');
  });
});

describe('isFeedbackOpen', () => {
  it('never opens for an upcoming session', () => {
    expect(isFeedbackOpen(talk, { date: '2026-09-11', minutesOfDay: 8 * 60 })).toBe(false);
  });

  it('opens the minute the session starts and stays open afterwards', () => {
    expect(isFeedbackOpen(talk, { date: '2026-09-11', minutesOfDay: 9 * 60 })).toBe(true);
    expect(isFeedbackOpen(talk, { date: '2026-09-12', minutesOfDay: 10 * 60 })).toBe(true);
  });

  it('closes after the grace period following the conference', () => {
    expect(FEEDBACK_CLOSE_DATE).toBe(addDays(CONFERENCE_DAY_DATE, 3));
    expect(isFeedbackOpen(talk, { date: FEEDBACK_CLOSE_DATE, minutesOfDay: 23 * 60 })).toBe(true);
    expect(isFeedbackOpen(talk, { date: addDays(FEEDBACK_CLOSE_DATE, 1), minutesOfDay: 0 })).toBe(false);
  });
});

describe('resolveDefaultScheduleDay', () => {
  it('lands on the community day before the event', () => {
    expect(resolveDefaultScheduleDay({ date: '2026-09-06', minutesOfDay: 600 })).toBe('community');
    expect(resolveDefaultScheduleDay({ date: '2026-09-09', minutesOfDay: 600 })).toBe('community');
  });

  it('lands on the workshop day on workshop day', () => {
    expect(resolveDefaultScheduleDay({ date: '2026-09-10', minutesOfDay: 600 })).toBe('workshop');
  });

  it('lands on the conference day from conference day onwards', () => {
    expect(resolveDefaultScheduleDay({ date: '2026-09-11', minutesOfDay: 0 })).toBe('conf');
    expect(resolveDefaultScheduleDay({ date: '2026-10-01', minutesOfDay: 0 })).toBe('conf');
  });
});

describe('isEventDay', () => {
  it('covers workshop day through the end of the feedback window', () => {
    expect(isEventDay({ date: '2026-09-09', minutesOfDay: 0 })).toBe(false);
    expect(isEventDay({ date: '2026-09-10', minutesOfDay: 0 })).toBe(true);
    expect(isEventDay({ date: FEEDBACK_CLOSE_DATE, minutesOfDay: 0 })).toBe(true);
    expect(isEventDay({ date: addDays(FEEDBACK_CLOSE_DATE, 1), minutesOfDay: 0 })).toBe(false);
  });
});
