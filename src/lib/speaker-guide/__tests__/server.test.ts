import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSpeakerGuideAccess } from '@/lib/speaker-guide/access';

const mocks = vi.hoisted(() => ({
  getAdminSpeakersWithSubmissions: vi.fn(),
  getAdminScheduleRows: vi.fn(),
  listProgramSessions: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/cfp/admin', () => ({
  getAdminSpeakersWithSubmissions: mocks.getAdminSpeakersWithSubmissions,
}));

vi.mock('@/lib/program/schedule', () => ({
  getAdminScheduleRows: mocks.getAdminScheduleRows,
}));

vi.mock('@/lib/program/sessions', () => ({
  listProgramSessions: mocks.listProgramSessions,
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: () => ({ from: mocks.from }),
}));

import { loadPersonalizedSpeakerGuide } from '@/lib/speaker-guide/server';

describe('personalized speaker guide loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAdminScheduleRows.mockResolvedValue({ rows: [] });
    mocks.listProgramSessions.mockResolvedValue({ sessions: [] });
  });

  it('uses submitted Logistics answers as the attendance source of truth', async () => {
    const speaker = {
      id: 'speaker-1',
      first_name: 'Taylor',
      last_name: 'Speaker',
      submissions: [],
    };
    mocks.getAdminSpeakersWithSubmissions.mockResolvedValue([speaker]);
    mocks.from.mockImplementation((table: string) => ({
      select: vi.fn().mockResolvedValue(
        table === 'cfp_speaker_logistics'
          ? {
              data: [{
                speaker_id: speaker.id,
                submitted_at: '2026-08-08T12:00:00.000Z',
                attending_warmup: true,
                attending_speakers_dinner: true,
                attending_after_party: false,
                attending_speaker_hangout: true,
                dinner_plus_one: false,
                after_party_plus_one: false,
                speaker_hangout_plus_one: false,
              }],
              error: null,
            }
          : { data: [], error: null }
      ),
    }));

    const guide = await loadPersonalizedSpeakerGuide(getSpeakerGuideAccess(speaker).code);
    const text = JSON.stringify(guide?.guide.sections);

    expect(text).toContain('speaker information has been submitted');
    expect(text).toContain('You&apos;re attending');
    expect(text).not.toContain('After Party at Seebad Enge');
    expect(text).toContain('Let us know if you&apos;re attending this event');
    expect(mocks.from).toHaveBeenCalledWith('cfp_speaker_logistics');
    expect(mocks.from).toHaveBeenCalledWith('speaker_activity_guests');
  });

  it('fails when program sessions cannot be loaded', async () => {
    mocks.getAdminSpeakersWithSubmissions.mockResolvedValue([]);
    mocks.listProgramSessions.mockResolvedValue({
      sessions: [],
      error: 'sessions unavailable',
    });
    mocks.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    await expect(loadPersonalizedSpeakerGuide('123456789012345678')).rejects.toThrow(
      'Failed to load personalized guide sessions: sessions unavailable'
    );
  });

  it('fails when the program schedule cannot be loaded', async () => {
    mocks.getAdminSpeakersWithSubmissions.mockResolvedValue([]);
    mocks.getAdminScheduleRows.mockResolvedValue({
      rows: [],
      error: 'schedule unavailable',
    });
    mocks.from.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    await expect(loadPersonalizedSpeakerGuide('123456789012345678')).rejects.toThrow(
      'Failed to load personalized guide schedule: schedule unavailable'
    );
  });
});
