import { z } from 'zod';
import { attendeeNetworkingProfileSchema } from '@/lib/validations/networking';

export const badgeCategorySchema = z.enum([
  'vip',
  'attendee',
  'speaker',
  'sponsor',
  'organizer',
]);

const optionalText = (maximum: number) => z.string().trim().max(maximum).default('');

const nullableLogoUrl = z.preprocess(
  (value) => typeof value === 'string' && value.trim() === '' ? null : value,
  z.string().trim().url('Enter a valid logo URL').refine(
    (value) => /^https?:\/\//i.test(value),
    'Only HTTP or HTTPS logo URLs are supported'
  ).nullable().default(null)
);

export const manualBadgeEntrySchema = z
  .object({
    category: badgeCategorySchema,
    firstName: z.string().trim().min(1, 'First name is required').max(120),
    lastName: optionalText(120),
    role: optionalText(200),
    company: optionalText(200),
    logoUrl: nullableLogoUrl,
    networkingEnabled: z.boolean().default(false),
    networkingProfile: attendeeNetworkingProfileSchema.default({
      linkedinUrl: null,
      githubUrl: null,
      xHandle: null,
      blueskyHandle: null,
      mastodonHandle: null,
      websiteUrl: null,
    }),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.category === 'sponsor' && !value.company) {
      context.addIssue({
        code: 'custom',
        message: 'Company is required for sponsor badges',
        path: ['company'],
      });
    }
    if (value.networkingEnabled && !Object.values(value.networkingProfile).some(Boolean)) {
      context.addIssue({
        code: 'custom',
        message: 'Add at least one networking link before enabling the share page',
        path: ['networkingProfile'],
      });
    }
  });

const badgeSelectionIdSchema = z
  .string()
  .min(3)
  .max(240)
  .regex(/^(attendee|speaker|sponsor|manual):[^:]+$/);

const exportLogoOverrideSchema = z.object({
  fileName: z.string().trim().min(1).max(255).regex(/\.png$/i, 'Logo override must be a PNG'),
  dataUrl: z
    .string()
    .max(14 * 1024 * 1024)
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/, 'Logo override must be a PNG data URL'),
}).strict();

export const badgeExportModeSchema = z.enum([
  'tab-pdfs',
  'tab-data',
  'all-pdfs',
  'all-data',
]);

export const badgeExportRequestSchema = z
  .object({
    provisionShareIds: z.boolean().default(false),
    mode: badgeExportModeSchema.default('all-data'),
    category: badgeCategorySchema.optional(),
    includedIds: z.array(badgeSelectionIdSchema).max(5_000).optional(),
    logoOverrides: z.record(badgeSelectionIdSchema, exportLogoOverrideSchema).default({}),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.mode.startsWith('tab-') && !value.category) {
      context.addIssue({
        code: 'custom',
        message: 'A category is required for a tab export',
        path: ['category'],
      });
    }
    const totalEncodedBytes = Object.values(value.logoOverrides)
      .reduce((total, logo) => total + logo.dataUrl.length, 0);
    if (totalEncodedBytes > 20 * 1024 * 1024) {
      context.addIssue({
        code: 'custom',
        message: 'Sponsor logo overrides exceed the 20 MB export limit',
        path: ['logoOverrides'],
      });
    }
  });

export type BadgeCategoryInput = z.infer<typeof badgeCategorySchema>;
export type ManualBadgeEntryInput = z.infer<typeof manualBadgeEntrySchema>;
