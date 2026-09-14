import { describe, it, expect } from 'vitest';
import { selectFeedbackDetail } from '../detail';
import type { AdminSessionFeedbackResponse, SessionFeedbackFeedEntry } from '@/lib/types/session-feedback';

function entry(overrides: Partial<SessionFeedbackFeedEntry> & { id: string }): SessionFeedbackFeedEntry {
  return {
    schedule_item_id: 'early',
    session_id: null,
    rating: 5,
    comment: null,
    created_at: '2026-09-11T08:00:00.000Z',
    sessionTitle: 'Talk early',
    ...overrides,
  };
}

const data: AdminSessionFeedbackResponse = {
  sessions: [
    {
      scheduleItemId: 'early',
      sessionId: 'sess-early',
      title: 'Talk early',
      date: '2026-09-11',
      startTime: '09:00:00',
      durationMinutes: 45,
      room: 'Main stage',
      kind: 'talk',
      speakers: ['Ada First'],
      speakerIds: ['a'],
      responseCount: 2,
      averageRating: 3.5,
      distribution: [0, 1, 0, 0, 1],
    },
    {
      scheduleItemId: 'late',
      sessionId: 'sess-late',
      title: 'Talk late',
      date: '2026-09-11',
      startTime: '14:00:00',
      durationMinutes: 45,
      room: null,
      kind: 'workshop',
      speakers: ['Ada First'],
      speakerIds: ['a'],
      responseCount: 1,
      averageRating: 4,
      distribution: [0, 0, 0, 1, 0],
    },
  ],
  speakers: [
    {
      speakerId: 'a',
      name: 'Ada First',
      role: 'Staff Engineer at Acme',
      imageUrl: null,
      sessions: [
        { scheduleItemId: 'early', title: 'Talk early', date: '2026-09-11', startTime: '09:00:00', responseCount: 2, averageRating: 3.5 },
        { scheduleItemId: 'late', title: 'Talk late', date: '2026-09-11', startTime: '14:00:00', responseCount: 1, averageRating: 4 },
      ],
      responseCount: 3,
      averageRating: 3.7,
      distribution: [0, 1, 0, 1, 1],
    },
  ],
  entries: [
    entry({ id: 'e3', schedule_item_id: 'late', rating: 4, comment: 'Loved the demo', sessionTitle: 'Talk late', created_at: '2026-09-11T13:00:00.000Z' }),
    entry({ id: 'e2', rating: 2, comment: 'Too fast', created_at: '2026-09-11T08:55:00.000Z' }),
    entry({ id: 'e1', rating: 5, created_at: '2026-09-11T08:50:00.000Z' }),
    entry({ id: 'orphan', schedule_item_id: null, rating: 1, comment: 'Slot was deleted', sessionTitle: 'Removed session' }),
  ],
  totals: { responses: 4, averageRating: 3, sessionsWithFeedback: 2 },
};

describe('selectFeedbackDetail', () => {
  it('builds a per-talk view with only that talk’s entries', () => {
    const detail = selectFeedbackDetail(data, { kind: 'session', id: 'early' })!;
    expect(detail.kind).toBe('session');
    expect(detail.title).toBe('Talk early');
    expect(detail.subtitle).toBe('Talk · Ada First · Main stage');
    expect(detail.responseCount).toBe(2);
    expect(detail.commentCount).toBe(1);
    expect(detail.averageRating).toBe(3.5);
    expect(detail.sessions).toEqual([]);
    expect(detail.entries.map((e) => e.id)).toEqual(['e2', 'e1']);
  });

  it('omits missing subtitle parts', () => {
    const detail = selectFeedbackDetail(data, { kind: 'session', id: 'late' })!;
    expect(detail.subtitle).toBe('Workshop · Ada First');
  });

  it('builds a per-speaker view pooling every session they appeared in', () => {
    const detail = selectFeedbackDetail(data, { kind: 'speaker', id: 'a' })!;
    expect(detail.kind).toBe('speaker');
    expect(detail.title).toBe('Ada First');
    expect(detail.subtitle).toBe('Staff Engineer at Acme');
    expect(detail.responseCount).toBe(3);
    expect(detail.commentCount).toBe(2);
    expect(detail.sessions).toHaveLength(2);
    // Newest first, and never the orphaned row from a deleted slot
    expect(detail.entries.map((e) => e.id)).toEqual(['e3', 'e2', 'e1']);
  });

  it('returns null when the target vanished between polls', () => {
    expect(selectFeedbackDetail(data, { kind: 'session', id: 'gone' })).toBeNull();
    expect(selectFeedbackDetail(data, { kind: 'speaker', id: 'gone' })).toBeNull();
  });
});
