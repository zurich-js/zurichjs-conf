import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { PublicProgramScheduleItem } from '@/lib/types/program-schedule';

let mergeWorkshopScheduleItems: typeof import('../schedule').mergeWorkshopScheduleItems;

beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'anon-key');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_123');
  vi.stubEnv('SUPABASE_SECRET_KEY', 'service-role-key');
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_123');
  vi.stubEnv('RESEND_API_KEY', 're_123');
  vi.stubEnv('ADMIN_PASSWORD', 'secret');

  ({ mergeWorkshopScheduleItems } = await import('../schedule'));
});

function makeWorkshopItem(
  overrides: Partial<PublicProgramScheduleItem> = {}
): PublicProgramScheduleItem {
  return {
    id: 'slot-1',
    date: '2026-09-10',
    start_time: '09:00:00',
    duration_minutes: 180,
    room: 'Workshop Room',
    type: 'session',
    title: 'Deep Dive Workshop',
    description: 'Learn by building.',
    session_id: 'session-1',
    submission_id: 'submission-1',
    is_visible: true,
    session: {
      id: 'session-1',
      cfp_submission_id: 'submission-1',
      slug: 'deep-dive-workshop',
      title: 'Deep Dive Workshop',
      abstract: 'Learn by building.',
      tags: [],
      type: 'workshop',
      level: 'intermediate',
      speakers: [],
      schedule: {
        date: '2026-09-10',
        start_time: '09:00:00',
        duration_minutes: 180,
        room: 'Workshop Room',
      },
    },
    speaker: null,
    speakers: [],
    session_kind: 'workshop',
    ...overrides,
  };
}

describe('mergeWorkshopScheduleItems', () => {
  it('keeps visible scheduled workshops visible even without a price', () => {
    const workshopItem = makeWorkshopItem();

    const result = mergeWorkshopScheduleItems([workshopItem]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: workshopItem.id,
      type: 'session',
      title: workshopItem.title,
      session_kind: 'workshop',
    });
    expect(result[0].session).not.toBeNull();
  });

  it('does not let offerings create visibility outside the public schedule', () => {
    const talkItem: PublicProgramScheduleItem = {
      ...makeWorkshopItem({
        id: 'talk-slot-1',
        session_id: 'talk-session-1',
        submission_id: 'talk-submission-1',
        title: 'Opening Talk',
        session_kind: 'talk',
      }),
      session: {
        ...makeWorkshopItem().session!,
        id: 'talk-session-1',
        cfp_submission_id: 'talk-submission-1',
        slug: 'opening-talk',
        title: 'Opening Talk',
        type: 'standard',
      },
    };

    const result = mergeWorkshopScheduleItems([talkItem]);

    expect(result).toEqual([talkItem]);
  });
});
