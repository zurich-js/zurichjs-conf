import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProgramScheduleItem, updateProgramScheduleItem } from '../schedule';
import type { ProgramScheduleItemInput } from '@/lib/types/program-schedule';

const mocks = vi.hoisted(() => ({
  single: vi.fn(),
}));

vi.mock('@/lib/supabase/cfp-client', () => ({
  createCfpServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mocks.single,
        }),
      }),
    }),
  }),
}));

const MAPS_URL_ERROR = 'A Google Maps link requires a venue name or address';

function storedItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'slot-1',
    date: '2026-09-10',
    start_time: '09:00:00',
    duration_minutes: 180,
    room: 'Headline',
    location_name: 'livingdocs AG Zürich',
    location_address: 'Förrlibuckstrasse 70, 8005 Zürich',
    location_maps_url: 'https://maps.app.goo.gl/abc123',
    type: 'session',
    title: 'Deep Dive Workshop',
    description: null,
    session_id: 'session-1',
    submission_id: null,
    is_visible: true,
    ...overrides,
  };
}

beforeEach(() => {
  mocks.single.mockReset();
});

describe('updateProgramScheduleItem maps-URL invariant', () => {
  it('rejects a patch that clears the venue fields while a stored maps URL remains', async () => {
    mocks.single.mockResolvedValue({ data: storedItem(), error: null });

    const result = await updateProgramScheduleItem('slot-1', {
      location_name: null,
      location_address: null,
    });

    expect(result.item).toBeNull();
    expect(result.error).toBe(MAPS_URL_ERROR);
  });

  it('rejects a patch that adds a maps URL to a row without a venue', async () => {
    mocks.single.mockResolvedValue({
      data: storedItem({ location_name: null, location_address: null, location_maps_url: null }),
      error: null,
    });

    const result = await updateProgramScheduleItem('slot-1', {
      location_maps_url: 'https://maps.app.goo.gl/abc123',
    });

    expect(result.item).toBeNull();
    expect(result.error).toBe(MAPS_URL_ERROR);
  });

  it('accepts a maps-URL-only patch when the stored row already has a venue', async () => {
    // The invariant passes on the merged state, so the update proceeds to the
    // DB write — which this test doesn't mock. Reaching that write (instead
    // of the invariant rejection) is the behavior under test.
    mocks.single.mockResolvedValue({ data: storedItem({ location_maps_url: null }), error: null });

    await expect(
      updateProgramScheduleItem('slot-1', { location_maps_url: 'https://maps.app.goo.gl/xyz789' })
    ).rejects.toThrow();
  });
});

describe('createProgramScheduleItem maps-URL invariant', () => {
  it('rejects a maps URL without a venue name or address', async () => {
    const input: ProgramScheduleItemInput = {
      date: '2026-09-10',
      start_time: '09:00:00',
      duration_minutes: 180,
      type: 'event',
      title: 'Offsite thing',
      location_maps_url: 'https://maps.app.goo.gl/abc123',
    };

    const result = await createProgramScheduleItem(input);

    expect(result.item).toBeNull();
    expect(result.error).toBe(MAPS_URL_ERROR);
  });
});
