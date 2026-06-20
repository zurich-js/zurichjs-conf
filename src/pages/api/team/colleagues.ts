/**
 * Team Colleagues API
 * Returns the count of confirmed ticket holders from the same work email domain.
 * Used at checkout to show "X colleagues from [company] are attending".
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createServiceRoleClient } from '@/lib/supabase';
import { isValidDomain, getColleagueCount } from '@/lib/team-detection';
import { logger } from '@/lib/logger';

const log = logger.scope('Team Colleagues API');

const querySchema = z.object({
  domain: z.string().min(3).max(253),
  exclude: z.string().email().optional(),
});

interface ColleaguesResponse {
  count: number;
  companyName: string | null;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ColleaguesResponse>
): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ count: 0, companyName: null, error: 'Method not allowed' });
    return;
  }

  const result = querySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ count: 0, companyName: null, error: 'Invalid domain' });
    return;
  }

  const { domain, exclude } = result.data;

  if (!isValidDomain(domain)) {
    res.status(400).json({ count: 0, companyName: null, error: 'Invalid domain format' });
    return;
  }

  try {
    const supabase = createServiceRoleClient();
    const { count, companyName } = await getColleagueCount(supabase, domain, exclude);

    // Cache for 5 minutes — colleague counts don't change rapidly
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.status(200).json({ count, companyName });
  } catch (error) {
    log.error('Failed to fetch colleague count', error, { domain });
    res.status(500).json({ count: 0, companyName: null, error: 'Internal server error' });
  }
}
