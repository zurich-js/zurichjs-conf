/**
 * Exit-Intent Survey API
 * Stores survey responses when users attempt to leave the cart page.
 * No auth required — user may not be logged in.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const log = logger.scope('Exit Intent Survey');

const bodySchema = z.object({
  session_id: z.string().min(1),
  email: z.string().email().optional(),
  reason: z.enum(['too_expensive', 'not_ready', 'comparing', 'missing_info', 'other']),
  reason_detail: z.string().max(1000).optional(),
  cart_total: z.number().int().optional(),
  cart_currency: z.string().max(3).optional(),
  cart_items_count: z.number().int().nonnegative().optional(),
  checkout_step: z.string().optional(),
  response_shown: z.string().optional(),
  response_clicked: z.boolean().optional(),
  posthog_distinct_id: z.string().optional(),
});

interface ExitIntentResponse {
  success: boolean;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExitIntentResponse>
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const result = bodySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ success: false, error: 'Validation failed' });
    return;
  }

  try {
    const supabase = createServiceRoleClient();

    // Table added in migration 20260518000000 — type will be available after
    // running regen-db-types once the migration is applied locally.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from as any)('exit_intent_responses')
      .insert(result.data);

    if (error) {
      log.error('Failed to insert exit intent response', error, {
        session_id: result.data.session_id,
      });
      res.status(500).json({ success: false, error: 'Failed to save response' });
      return;
    }

    log.info('Exit intent survey recorded', {
      reason: result.data.reason,
      checkout_step: result.data.checkout_step,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    log.error('Error processing exit intent survey', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
