import { describe, expect, it } from 'vitest';
import { manualBadgeEntrySchema } from '@/lib/validations/badges';

const emptyEntry = {
  firstName: '',
  lastName: '',
  role: '',
  company: '',
  logoUrl: null,
  networkingEnabled: false,
  networkingProfile: {},
};

describe('manualBadgeEntrySchema', () => {
  it.each(['sponsor', 'organizer'] as const)('allows an empty %s placeholder row', (category) => {
    expect(manualBadgeEntrySchema.safeParse({ ...emptyEntry, category }).success).toBe(true);
  });

  it.each(['vip', 'attendee', 'speaker'] as const)('still requires a name for %s rows', (category) => {
    const result = manualBadgeEntrySchema.safeParse({ ...emptyEntry, category });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(expect.objectContaining({
        message: 'First name is required',
        path: ['firstName'],
      }));
    }
  });
});
