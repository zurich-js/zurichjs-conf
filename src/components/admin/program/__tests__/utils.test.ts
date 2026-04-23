import { describe, expect, it } from 'vitest';
import type { Workshop } from '@/lib/types/database';
import type { ProgramSession } from '@/lib/types/program';
import type { ProgramScheduleItemRecord } from '@/lib/types/program-schedule';
import type { SpeakerWithSessions } from '@/components/admin/speakers';
import {
  filterProgramSessions,
  getInsertionDraftAfter,
  getScheduleNeighbors,
  groupScheduleItemsByDay,
  getSessionScheduleCount,
  hasMissingSpeakerProfile,
  inferScheduleDurationForSession,
  isWorkshopCommerceReady,
  matchesProgramSearch,
  scheduleItemsOverlap,
} from '../utils';

const speaker: SpeakerWithSessions = {
  id: 'speaker-1',
  email: 'speaker@example.com',
  first_name: 'Ada',
  last_name: 'Lovelace',
  job_title: 'Engineer',
  company: 'Analytical Engines',
  bio: 'Writes excellent talks.',
  linkedin_url: null,
  github_url: null,
  twitter_handle: null,
  bluesky_handle: null,
  mastodon_handle: null,
  profile_image_url: 'https://example.com/ada.png',
  header_image_url: null,
  portrait_foreground_url: null,
  portrait_background_url: null,
  is_admin_managed: true,
  is_visible: true,
  is_featured: false,
  speaker_role: 'speaker',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
  submissions: [],
};

function makeSession(overrides: Partial<ProgramSession> = {}): ProgramSession {
  return {
    id: 'session-1',
    cfp_submission_id: 'submission-1',
    kind: 'talk',
    title: 'Practical Agents',
    abstract: 'A talk about agents.',
    level: 'intermediate',
    status: 'confirmed',
    workshop_duration_minutes: null,
    workshop_capacity: null,
    metadata: {},
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    speakers: [{ session_id: 'session-1', speaker_id: 'speaker-1', role: 'speaker', sort_order: 0 }],
    ...overrides,
  };
}

const scheduleItem: ProgramScheduleItemRecord = {
  id: 'slot-1',
  date: '2026-09-11',
  start_time: '09:00:00',
  duration_minutes: 30,
  room: 'Main',
  type: 'session',
  title: 'Practical Agents',
  description: null,
  session_id: 'session-1',
  submission_id: 'submission-1',
  is_visible: true,
};

it('counts schedule placements by session id or legacy submission id', () => {
  expect(getSessionScheduleCount(makeSession(), [scheduleItem])).toBe(1);
  expect(getSessionScheduleCount(makeSession({ id: 'other' }), [{ ...scheduleItem, session_id: null }])).toBe(1);
});

it('detects missing speaker profile data', () => {
  expect(hasMissingSpeakerProfile(makeSession(), [speaker])).toBe(false);
  expect(hasMissingSpeakerProfile(makeSession(), [{ ...speaker, bio: null }])).toBe(true);
  expect(hasMissingSpeakerProfile(makeSession({ speakers: [] }), [speaker])).toBe(true);
});

it('recognizes commerce-ready workshop offerings', () => {
  const offering = {
    status: 'published',
    stripe_product_id: 'prod_123',
    stripe_price_lookup_key: 'workshop_agents',
    metadata: { stripeValidation: { valid: true } },
  } as unknown as Workshop;

  expect(isWorkshopCommerceReady(offering)).toBe(true);
  expect(isWorkshopCommerceReady({ ...offering, status: 'draft' })).toBe(false);
});

describe('filterProgramSessions', () => {
  it('filters scheduled, unscheduled, missing speaker, and commerce-ready sessions', () => {
    const talk = makeSession();
    const unscheduled = makeSession({ id: 'session-2', cfp_submission_id: null, title: 'Unscheduled' });
    const workshop = makeSession({ id: 'session-3', kind: 'workshop', title: 'Workshop' });
    const offerings = new Map<string, Workshop | null>([
      ['session-3', {
        status: 'published',
        stripe_product_id: 'prod_123',
        stripe_price_lookup_key: 'workshop_agents',
        metadata: { stripeValidation: { valid: true } },
      } as unknown as Workshop],
    ]);

    expect(filterProgramSessions([talk, unscheduled], 'scheduled', [scheduleItem], [speaker], offerings)).toEqual([talk]);
    expect(filterProgramSessions([talk, unscheduled], 'unscheduled', [scheduleItem], [speaker], offerings)).toEqual([unscheduled]);
    expect(filterProgramSessions([makeSession({ speakers: [] })], 'missing-speakers', [], [speaker], offerings)).toHaveLength(1);
    expect(filterProgramSessions([workshop], 'commerce-ready', [], [speaker], offerings)).toEqual([workshop]);
  });
});

it('matches search by session and speaker text', () => {
  expect(matchesProgramSearch(makeSession(), 'agents', [speaker])).toBe(true);
  expect(matchesProgramSearch(makeSession(), 'lovelace', [speaker])).toBe(true);
  expect(matchesProgramSearch(makeSession(), 'rust', [speaker])).toBe(false);
});

it('groups schedule items by day in chronological order', () => {
  const groups = groupScheduleItemsByDay([
    { ...scheduleItem, id: 'slot-3', date: '2026-09-12', start_time: '10:00:00' },
    { ...scheduleItem, id: 'slot-2', date: '2026-09-11', start_time: '08:30:00' },
    scheduleItem,
  ]);

  expect(groups.map((group) => group.date)).toEqual(['2026-09-11', '2026-09-12']);
  expect(groups[0].items.map((item) => item.id)).toEqual(['slot-2', 'slot-1']);
  expect(groups[0].label).toContain('Friday');
});

it('detects schedule overlaps and nearby neighbors in the same room', () => {
  const current = { ...scheduleItem, id: 'current', start_time: '10:00:00', duration_minutes: 30 };
  const previous = { ...scheduleItem, id: 'previous', start_time: '09:00:00', duration_minutes: 30 };
  const overlap = { ...scheduleItem, id: 'overlap', start_time: '10:15:00', duration_minutes: 30 };
  const next = { ...scheduleItem, id: 'next', start_time: '10:30:00', duration_minutes: 30 };
  const otherRoom = { ...scheduleItem, id: 'other-room', room: 'Side', start_time: '10:15:00', duration_minutes: 30 };

  expect(scheduleItemsOverlap(current, overlap)).toBe(true);
  expect(scheduleItemsOverlap(current, otherRoom)).toBe(false);

  const neighbors = getScheduleNeighbors(current, [next, overlap, previous, otherRoom, current]);
  expect(neighbors.previous?.id).toBe('previous');
  expect(neighbors.next?.id).toBe('next');
  expect(neighbors.overlaps.map((item) => item.id)).toEqual(['overlap']);
});

it('infers schedule durations from session shape', () => {
  expect(inferScheduleDurationForSession(makeSession({ kind: 'workshop', workshop_duration_minutes: 180 }))).toBe(180);
  expect(inferScheduleDurationForSession(makeSession({ metadata: { legacy_submission_type: 'lightning' } }))).toBe(20);
  expect(inferScheduleDurationForSession(makeSession({ metadata: { legacy_submission_type: 'standard' } }))).toBe(35);
  expect(inferScheduleDurationForSession(null)).toBe(30);
});

it('creates insertion drafts from previous slot end time', () => {
  expect(getInsertionDraftAfter(null, '2026-09-11')).toEqual({
    date: '2026-09-11',
    start_time: '09:00',
    room: null,
  });
  expect(getInsertionDraftAfter({ ...scheduleItem, start_time: '10:00:00', duration_minutes: 35, room: 'Main' }, '2026-09-11')).toEqual({
    date: '2026-09-11',
    start_time: '10:35',
    room: 'Main',
  });
});
