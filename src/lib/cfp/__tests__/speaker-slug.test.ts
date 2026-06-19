/**
 * Unit Tests for speaker slug derivation.
 *
 * These guard the shared slug logic used by both getVisibleSpeakersWithSessions
 * (the full public listing) and getSpeakerOgSummaryBySlug (the lightweight OG
 * lookup). The two must agree, so the collision rule and ordering are pinned.
 */

import { describe, it, expect } from 'vitest';
import { baseSpeakerSlug, buildSpeakerSlugMap } from '../speakers';

describe('baseSpeakerSlug', () => {
  it('slugifies a normal name', () => {
    expect(baseSpeakerSlug('Ada', 'Lovelace', 'id-1')).toBe('ada-lovelace');
  });

  it('strips punctuation and collapses separators', () => {
    expect(baseSpeakerSlug('Jean-Luc', "O'Brien", 'id-1')).toBe('jean-luc-o-brien');
  });

  it('falls back to the id when the name has no slug characters', () => {
    expect(baseSpeakerSlug('🙂', '', 'fallback-id')).toBe('fallback-id');
  });
});

describe('buildSpeakerSlugMap', () => {
  it('gives the first speaker the bare slug and later collisions a suffix', () => {
    const rows = [
      { id: 'aaaaaaaa-1111', first_name: 'Sam', last_name: 'Smith' },
      { id: 'bbbbbbbb-2222', first_name: 'Sam', last_name: 'Smith' },
    ];

    const map = buildSpeakerSlugMap(rows);

    expect(map.get('aaaaaaaa-1111')).toBe('sam-smith');
    expect(map.get('bbbbbbbb-2222')).toBe('sam-smith-bbbbbbbb');
  });

  it('depends on order — the first row in the array keeps the bare slug', () => {
    const reversed = [
      { id: 'bbbbbbbb-2222', first_name: 'Sam', last_name: 'Smith' },
      { id: 'aaaaaaaa-1111', first_name: 'Sam', last_name: 'Smith' },
    ];

    const map = buildSpeakerSlugMap(reversed);

    expect(map.get('bbbbbbbb-2222')).toBe('sam-smith');
    expect(map.get('aaaaaaaa-1111')).toBe('sam-smith-aaaaaaaa');
  });

  it('leaves distinct names untouched', () => {
    const rows = [
      { id: 'id-1', first_name: 'Ada', last_name: 'Lovelace' },
      { id: 'id-2', first_name: 'Grace', last_name: 'Hopper' },
    ];

    const map = buildSpeakerSlugMap(rows);

    expect(map.get('id-1')).toBe('ada-lovelace');
    expect(map.get('id-2')).toBe('grace-hopper');
  });
});
