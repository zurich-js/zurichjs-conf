import { describe, expect, it } from 'vitest';
import type { SavedNetworkingProfile } from '@/lib/types/networking';
import {
  dedupeSavedNetworkingProfiles,
  parseSavedNetworkingProfiles,
  removeSavedNetworkingProfile,
} from '@/lib/networking/storage';

const ada: SavedNetworkingProfile = {
  publicId: 'speaker-ada',
  kind: 'speaker',
  name: 'Ada Lovelace',
  headline: 'Computing pioneer',
  imageUrl: null,
  links: [
    { kind: 'linkedin', label: 'LinkedIn', href: 'https://linkedin.com/in/ada' },
    { kind: 'mastodon', label: 'Mastodon', href: 'https://mastodon.social/@ada' },
  ],
  path: '/share/speaker-ada',
  savedAt: '2026-08-07T10:00:00.000Z',
  version: 1,
};

const grace: SavedNetworkingProfile = {
  ...ada,
  publicId: 'attendee-grace',
  kind: 'attendee',
  name: 'Grace Hopper',
  path: '/share/attendee-grace',
};

describe('saved networking profile storage helpers', () => {
  it('parses valid snapshots and ignores malformed entries', () => {
    const result = parseSavedNetworkingProfiles(
      JSON.stringify([
        ada,
        { ...grace, links: [{ kind: 'email', label: 'Email', href: 'javascript:alert(1)' }] },
        { ...grace, imageUrl: 'javascript:alert(1)' },
        { nope: true },
      ])
    );

    expect(result).toEqual([ada]);
  });

  it('returns an empty list for corrupt or unexpected storage values', () => {
    expect(parseSavedNetworkingProfiles('not-json')).toEqual([]);
    expect(parseSavedNetworkingProfiles(JSON.stringify({ profile: ada }))).toEqual([]);
    expect(parseSavedNetworkingProfiles(null)).toEqual([]);
  });

  it('dedupes by public ID while retaining the first snapshot', () => {
    const updatedAda = { ...ada, headline: 'Updated profile' };
    expect(dedupeSavedNetworkingProfiles([updatedAda, grace, ada])).toEqual([
      updatedAda,
      grace,
    ]);
  });

  it('removes only the requested public profile without mutating the input', () => {
    const profiles = [ada, grace];
    expect(removeSavedNetworkingProfile(profiles, ada.publicId)).toEqual([grace]);
    expect(profiles).toEqual([ada, grace]);
  });
});
