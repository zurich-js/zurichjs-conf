/**
 * CFP Admin Submissions API
 * GET /api/admin/cfp/submissions - List all submissions
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAdminSubmissions } from '@/lib/cfp/admin';
import { verifyAdminAccess } from '@/lib/admin/auth';
import type { CfpSubmissionStatus, CfpSubmissionType, CfpTalkLevel } from '@/lib/types/cfp';
import type { SubmissionSortRule } from '@/lib/types/cfp/admin';
import { logger } from '@/lib/logger';

const log = logger.scope('CFP Admin Submissions API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin authentication (same as main admin)
  const { authorized } = verifyAdminAccess(req);
  if (!authorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const {
      status,
      submission_type,
      statuses,
      types,
      talk_level,
      search,
      sort,
      sort_by,
      sort_order,
      limit,
      offset,
      min_review_count,
      shortlist_only,
      shortlistStatuses,
      coverage_min,
      coverage_max,
      decisionStatuses,
      emailStates,
    } = req.query;

    let parsedSort: SubmissionSortRule[] | undefined;
    if (typeof sort === 'string') {
      try {
        const value = JSON.parse(sort) as SubmissionSortRule[];
        if (Array.isArray(value)) {
          parsedSort = value.filter((item): item is SubmissionSortRule =>
            Boolean(item && typeof item.key === 'string' && (item.direction === 'asc' || item.direction === 'desc'))
          );
        }
      } catch {
        parsedSort = undefined;
      }
    }

    const parsedStatuses = Array.isArray(statuses)
      ? statuses
      : typeof statuses === 'string'
        ? [statuses]
        : undefined;

    const parsedTypes = Array.isArray(types)
      ? types
      : typeof types === 'string'
        ? [types]
        : undefined;

    const parsedShortlistStatuses = Array.isArray(shortlistStatuses)
      ? shortlistStatuses
      : typeof shortlistStatuses === 'string'
        ? [shortlistStatuses]
        : undefined;

    const parsedDecisionStatuses = Array.isArray(decisionStatuses)
      ? decisionStatuses
      : typeof decisionStatuses === 'string'
        ? [decisionStatuses]
        : undefined;

    const parsedEmailStates = Array.isArray(emailStates)
      ? emailStates
      : typeof emailStates === 'string'
        ? [emailStates]
        : undefined;

    const parsedCoverageMin = typeof coverage_min === 'string' ? Number(coverage_min) : undefined;
    const parsedCoverageMax = typeof coverage_max === 'string' ? Number(coverage_max) : undefined;

    const { submissions, total, totalUnfiltered } = await getAdminSubmissions({
      status: parsedStatuses?.length
        ? (parsedStatuses as CfpSubmissionStatus[])
        : status
          ? (status as CfpSubmissionStatus)
          : undefined,
      submission_type: parsedTypes?.length
        ? (parsedTypes as CfpSubmissionType[])
        : submission_type
          ? (submission_type as CfpSubmissionType)
          : undefined,
      talk_level: talk_level ? (talk_level as CfpTalkLevel) : undefined,
      search: search as string | undefined,
      sort: parsedSort,
      sort_by: sort_by as 'created_at' | 'avg_score' | 'review_count' | 'title' | 'coverage' | 'last_reviewed' | 'speaker' | 'shortlist' | undefined,
      sort_order: sort_order as 'asc' | 'desc' | undefined,
      limit: limit ? parseInt(limit as string) : 10,
      offset: offset ? parseInt(offset as string) : 0,
      min_review_count: min_review_count ? parseInt(min_review_count as string) : undefined,
      shortlist_only: shortlist_only === 'true',
      shortlist_statuses: parsedShortlistStatuses,
      coverage_min: Number.isFinite(parsedCoverageMin) ? parsedCoverageMin : undefined,
      coverage_max: Number.isFinite(parsedCoverageMax) ? parsedCoverageMax : undefined,
      decision_statuses: parsedDecisionStatuses,
      email_states: parsedEmailStates,
    });

    return res.status(200).json({ submissions, total, totalUnfiltered });
  } catch (error) {
    log.error('Error fetching submissions', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
