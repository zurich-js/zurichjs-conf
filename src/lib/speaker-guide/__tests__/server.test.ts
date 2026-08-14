import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSpeakerGuideAccess } from '@/lib/speaker-guide/access';

const mocks = vi.hoisted(() => ({
  getAdminSpeakersWithSubmissions: vi.fn(),
  getAdminScheduleRows: vi.fn(),
  listProgramSessions: vi.fn(),
  from: vi.fn(),
  logisticsEq: vi.fn(),
  guestsEq: vi.fn(),
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
    vi.stubEnv('ORDER_TOKEN_SECRET', 'test-guide-secret');
    mocks.getAdminScheduleRows.mockResolvedValue({ rows: [] });
    mocks.listProgramSessions.mockResolvedValue({ sessions: [] });
    mocks.logisticsEq.mockResolvedValue({ data: [], error: null });
    mocks.guestsEq.mockResolvedValue({ data: [], error: null });
    mocks.from.mockImplementation((table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: table === 'cfp_speaker_logistics'
          ? mocks.logisticsEq
          : mocks.guestsEq,
      }),
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses submitted Logistics answers as the attendance source of truth', async () => {
    const speaker = {
      id: 'speaker-1',
      first_name: 'Taylor',
      last_name: 'Speaker',
      submissions: [],
    };
    mocks.getAdminSpeakersWithSubmissions.mockResolvedValue([speaker]);
    mocks.logisticsEq.mockResolvedValue({
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
    });

    const guide = await loadPersonalizedSpeakerGuide(getSpeakerGuideAccess(speaker).code);
    const text = JSON.stringify(guide?.guide.sections);

    expect(text).toContain('Info submitted');
    expect(text).toContain('Attending');
    expect(text).not.toContain('After Party at Seebad Enge');
    expect(text).toContain('Not attending');
    expect(mocks.from).toHaveBeenCalledWith('cfp_speaker_logistics');
    expect(mocks.from).toHaveBeenCalledWith('speaker_activity_guests');
    expect(mocks.logisticsEq).toHaveBeenCalledWith('speaker_id', speaker.id);
    expect(mocks.guestsEq).toHaveBeenCalledWith('related_speaker_id', speaker.id);
  });

  it('ignores unsubmitted draft answers just like the admin overview', async () => {
    const speaker = {
      id: 'speaker-draft',
      first_name: 'Theo',
      last_name: 'Blanc',
      submissions: [],
    };
    mocks.getAdminSpeakersWithSubmissions.mockResolvedValue([speaker]);
    mocks.logisticsEq.mockResolvedValue({
      data: [{
        speaker_id: speaker.id,
        submitted_at: null,
        attending_warmup: true,
        attending_speakers_dinner: false,
        attending_after_party: true,
        attending_speaker_hangout: false,
        after_party_plus_one: true,
        after_party_plus_one_first_name: 'Draft',
        after_party_plus_one_last_name: 'Guest',
      }],
      error: null,
    });

    const guide = await loadPersonalizedSpeakerGuide(getSpeakerGuideAccess(speaker).code);
    const text = JSON.stringify(guide?.guide.sections);

    expect(text.match(/RSVP pending/g)).toHaveLength(4);
    expect(text).not.toContain('Attending');
    expect(text).not.toContain('Info submitted');
    expect(text).not.toContain('Draft Guest');
  });

  it('does not query private logistics data when the access code is unknown', async () => {
    mocks.getAdminSpeakersWithSubmissions.mockResolvedValue([{
      id: 'speaker-1',
      first_name: 'Taylor',
      last_name: 'Speaker',
      submissions: [],
    }]);

    await expect(
      loadPersonalizedSpeakerGuide(getSpeakerGuideAccess({
        id: 'unknown-speaker',
        first_name: 'Unknown',
        last_name: 'Speaker',
      }).code)
    ).resolves.toBeNull();

    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('fails when program sessions cannot be loaded', async () => {
    mocks.getAdminSpeakersWithSubmissions.mockResolvedValue([]);
    mocks.listProgramSessions.mockResolvedValue({
      sessions: [],
      error: 'sessions unavailable',
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

    await expect(loadPersonalizedSpeakerGuide('123456789012345678')).rejects.toThrow(
      'Failed to load personalized guide schedule: schedule unavailable'
    );
  });
});
