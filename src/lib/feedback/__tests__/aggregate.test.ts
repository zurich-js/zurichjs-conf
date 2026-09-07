import { describe, it, expect } from 'vitest';
import type { ProgramScheduleItemRecord } from '@/lib/types/program-schedule';
import { averageRating, buildAdminFeedbackResponse } from '../aggregate';
import type { SessionFeedbackRow } from '../types';

function item(overrides: Partial<ProgramScheduleItemRecord> & { id: string }): ProgramScheduleItemRecord {
  return {
    date: '2026-09-11',
    start_time: '09:00:00',
    duration_minutes: 45,
    room: 'Main stage',
    type: 'session',
    title: 'Slot',
    description: null,
    session_id: `sess-${overrides.id}`,
    submission_id: null,
    is_visible: true,
    vip_only: false,
    program_session: {
      id: `sess-${overrides.id}`,
      cfp_submission_id: null,
      kind: 'talk',
      title: `Talk ${overrides.id}`,
      abstract: null,
      level: 'intermediate',
      status: 'published',
      metadata: null,
      speakers: [
        { speaker_id: 'b', role: null, sort_order: 2, speaker: { id: 'b', first_name: 'Bea', last_name: 'Second', job_title: null, company: null, profile_image_url: null } },
        { speaker_id: 'a', role: null, sort_order: 1, speaker: { id: 'a', first_name: 'Ada', last_name: 'First', job_title: null, company: null, profile_image_url: null } },
      ],
    },
    ...overrides,
  };
}

function row(overrides: Partial<SessionFeedbackRow> & { id: string; schedule_item_id: string | null }): SessionFeedbackRow {
  return { session_id: null, rating: 5, comment: null, created_at: '2026-09-11T08:00:00.000Z', ...overrides };
}

describe('averageRating', () => {
  it('is null with no rows and rounds to one decimal otherwise', () => {
    expect(averageRating([])).toBeNull();
    expect(averageRating([{ rating: 5 }, { rating: 4 }, { rating: 4 }])).toBe(4.3);
  });
});

describe('buildAdminFeedbackResponse', () => {
  const items = [
    item({ id: 'late', start_time: '14:00:00' }),
    item({ id: 'early', start_time: '09:00:00' }),
    item({ id: 'break', type: 'break', program_session: null, session_id: null }),
    item({ id: 'workshop', date: '2026-09-10', program_session: { ...item({ id: 'workshop' }).program_session!, kind: 'workshop', speakers: [] } }),
  ];
  const rows = [
    row({ id: 'r1', schedule_item_id: 'early', rating: 5, created_at: '2026-09-11T07:50:00.000Z' }),
    row({ id: 'r2', schedule_item_id: 'early', rating: 2, comment: 'Too fast', created_at: '2026-09-11T07:55:00.000Z' }),
    row({ id: 'r3', schedule_item_id: 'gone', rating: 4, created_at: '2026-09-11T07:58:00.000Z' }),
    row({ id: 'r4', schedule_item_id: null, rating: 1, comment: 'Slot was deleted', created_at: '2026-09-11T07:59:00.000Z' }),
  ];

  const result = buildAdminFeedbackResponse(items, rows);

  it('lists only rateable sessions, in schedule order', () => {
    expect(result.sessions.map((s) => s.scheduleItemId)).toEqual(['workshop', 'early', 'late']);
  });

  it('rolls ratings up per session with a star distribution', () => {
    const early = result.sessions.find((s) => s.scheduleItemId === 'early')!;
    expect(early.responseCount).toBe(2);
    expect(early.averageRating).toBe(3.5);
    expect(early.distribution).toEqual([0, 1, 0, 0, 1]);
    expect(early.speakers).toEqual(['Ada First', 'Bea Second']);
    expect(early.kind).toBe('talk');

    const late = result.sessions.find((s) => s.scheduleItemId === 'late')!;
    expect(late.responseCount).toBe(0);
    expect(late.averageRating).toBeNull();
  });

  it('maps session kinds and tolerates missing speakers', () => {
    const workshop = result.sessions.find((s) => s.scheduleItemId === 'workshop')!;
    expect(workshop.kind).toBe('workshop');
    expect(workshop.speakers).toEqual([]);
  });

  it('feeds entries newest first and labels orphaned rows (unknown or deleted slot)', () => {
    expect(result.entries.map((e) => e.id)).toEqual(['r4', 'r3', 'r2', 'r1']);
    expect(result.entries[0].sessionTitle).toBe('Removed session');
    expect(result.entries[1].sessionTitle).toBe('Removed session');
    expect(result.entries[2].sessionTitle).toBe('Talk early');
  });

  it('totals across every row, including orphans', () => {
    expect(result.totals).toEqual({ responses: 4, averageRating: 3, sessionsWithFeedback: 1 });
  });
});
