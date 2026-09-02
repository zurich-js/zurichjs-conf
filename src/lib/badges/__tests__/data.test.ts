import { describe, expect, it, vi } from 'vitest';
import { assignMissingBadgeCodes, assignRegeneratedBadgeCodes } from '@/lib/badges/data';

describe('badge provisioning data', () => {
  it('assigns codes to new rows without replacing stable existing codes', () => {
    const createCode = vi.fn()
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-8222-222222222222');

    const rows = assignMissingBadgeCodes([
      {
        subject_key: 'attendee:new-ticket',
        target_public_id: 'attendee-new-share',
      },
      {
        subject_key: 'attendee:transferred-ticket',
        target_public_id: 'attendee-new-share-after-transfer',
        code: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
      {
        subject_key: 'speaker:new-speaker',
        target_public_id: 'speaker-new-speaker',
      },
    ], createCode);

    expect(rows).toEqual([
      {
        subject_key: 'attendee:new-ticket',
        target_public_id: 'attendee-new-share',
        code: '11111111-1111-4111-8111-111111111111',
      },
      {
        subject_key: 'attendee:transferred-ticket',
        target_public_id: 'attendee-new-share-after-transfer',
        code: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
      {
        subject_key: 'speaker:new-speaker',
        target_public_id: 'speaker-new-speaker',
        code: '22222222-2222-4222-8222-222222222222',
      },
    ]);
    expect(createCode).toHaveBeenCalledTimes(2);
  });

  it('replaces every code while preserving each stable share target', () => {
    const createCode = vi.fn()
      .mockReturnValueOnce('11111111-1111-4111-8111-111111111111')
      .mockReturnValueOnce('22222222-2222-4222-8222-222222222222');

    expect(assignRegeneratedBadgeCodes([
      {
        subject_key: 'attendee:ticket-one',
        target_public_id: 'attendee-stable-share',
        code: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
      {
        subject_key: 'manual:organizer-one',
        target_public_id: 'badge-stable-share',
        code: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      },
    ], createCode)).toEqual([
      {
        subject_key: 'attendee:ticket-one',
        target_public_id: 'attendee-stable-share',
        code: '11111111-1111-4111-8111-111111111111',
      },
      {
        subject_key: 'manual:organizer-one',
        target_public_id: 'badge-stable-share',
        code: '22222222-2222-4222-8222-222222222222',
      },
    ]);
    expect(createCode).toHaveBeenCalledTimes(2);
  });
});
