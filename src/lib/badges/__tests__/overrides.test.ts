import { describe, expect, it } from 'vitest';
import type { BadgeEntry } from '@/lib/badges/export';
import { applyBadgeEntryOverrides } from '@/lib/badges/overrides';

const entry: BadgeEntry = {
  category: 'speaker',
  source: 'speaker',
  selectionId: 'speaker:public-speaker',
  id: 'public-speaker',
  firstName: 'ADA',
  lastName: 'lovelace',
  role: 'engineer',
  company: 'engines',
  publicId: 'speaker-ada',
  badgeCode: '11111111-2222-4333-8444-555555555555',
  shareUrl: 'https://conf.example.test/share/speaker-ada',
  qrUrl: 'https://conf.example.test/b/11111111-2222-4333-8444-555555555555',
  logoUrl: null,
};

describe('temporary badge entry overrides', () => {
  it('changes only printable fields on a copied entry', () => {
    const result = applyBadgeEntryOverrides([entry], new Map([[entry.selectionId, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      role: 'Engineer',
      company: 'Engines',
    }]]));

    expect(result[0]).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      role: 'Engineer',
      company: 'Engines',
      badgeCode: entry.badgeCode,
      publicId: entry.publicId,
    });
    expect(result[0]).not.toBe(entry);
    expect(entry).toMatchObject({ firstName: 'ADA', lastName: 'lovelace' });
  });
});
