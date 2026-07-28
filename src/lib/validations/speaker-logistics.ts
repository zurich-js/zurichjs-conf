import { z } from 'zod';
import { TSHIRT_SIZES } from './cfp';

/**
 * Speaker Logistics Validation Schemas
 * Zod schemas for the token-authenticated speaker event-logistics form
 * (event RSVPs, dietary restrictions, plus ones, t-shirt size,
 * talk/workshop accommodations)
 */

const isValidEmail = (value: string): boolean => z.string().email().safeParse(value).success;

export const speakerLogisticsSchema = z
  .object({
    attending_warmup: z.boolean({
      message: 'Please tell us if you are attending the warm-up meetup',
    }),
    attending_speakers_dinner: z.boolean({
      message: 'Please tell us if you are attending the speakers dinner',
    }),
    attending_after_party: z.boolean({
      message: 'Please tell us if you are attending the after party',
    }),
    attending_speaker_hangout: z.boolean({
      message: 'Please tell us if you are joining the speaker hangout activities',
    }),
    speaker_hangout_plus_one: z.boolean().optional().nullable(),
    dietary_restrictions: z
      .string()
      .max(1000, 'Dietary restrictions is too long')
      .optional()
      .nullable(),
    dinner_plus_one: z.boolean().optional().nullable(),
    dinner_plus_one_dietary_restrictions: z
      .string()
      .max(1000, 'Dietary restrictions is too long')
      .optional()
      .nullable(),
    after_party_plus_one: z.boolean().optional().nullable(),
    after_party_plus_one_first_name: z
      .string()
      .max(100, 'First name is too long')
      .optional()
      .nullable(),
    after_party_plus_one_last_name: z
      .string()
      .max(100, 'Last name is too long')
      .optional()
      .nullable(),
    after_party_plus_one_email: z.string().max(255, 'Email is too long').optional().nullable(),
    talk_special_accommodations: z
      .string()
      .max(2000, 'Special accommodations is too long')
      .optional()
      .nullable(),
    tshirt_size: z.enum(TSHIRT_SIZES).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // The after-party plus one gets a VIP ticket issued, so we need their
    // full contact details when the speaker is bringing one
    if (data.attending_after_party && data.after_party_plus_one) {
      if (!data.after_party_plus_one_first_name?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['after_party_plus_one_first_name'],
          message: "Your plus one's first name is required so we can issue their VIP ticket",
        });
      }
      if (!data.after_party_plus_one_last_name?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['after_party_plus_one_last_name'],
          message: "Your plus one's last name is required so we can issue their VIP ticket",
        });
      }
      const email = data.after_party_plus_one_email?.trim();
      if (!email) {
        ctx.addIssue({
          code: 'custom',
          path: ['after_party_plus_one_email'],
          message: "Your plus one's email is required so we can issue their VIP ticket",
        });
      } else if (!isValidEmail(email)) {
        ctx.addIssue({
          code: 'custom',
          path: ['after_party_plus_one_email'],
          message: 'Invalid email address',
        });
      }
    }
  });

export type SpeakerLogisticsFormData = z.infer<typeof speakerLogisticsSchema>;
