/**
 * Admin Verifications API
 * GET /api/admin/verifications - List verification requests
 *
 * Returns verification requests with has_purchased_ticket flag indicating
 * if the verified person has purchased a ticket (matching email, case-insensitive).
 * Also returns global stats computed from ALL verifications regardless of filter.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyAdminAccess } from '@/lib/admin/auth';
import { createServiceRoleClient } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const log = logger.scope('Admin Verifications API');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { authorized } = verifyAdminAccess(req);
    if (!authorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const supabase = createServiceRoleClient();
    const { status } = req.query;

    // Always fetch ALL verifications first (for global stats)
    const { data: allVerifications, error: allError } = await supabase
      .from('verification_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) {
      log.error('Error fetching verifications', allError);
      return res.status(500).json({ error: 'Failed to fetch verifications' });
    }

    if (!allVerifications || allVerifications.length === 0) {
      return res.status(200).json({
        verifications: [],
        stats: { total: 0, pending: 0, approved: 0, rejected: 0, purchased: 0, approvedNotPurchased: 0 },
        ticketLookupFailed: false,
      });
    }

    // Fetch ALL confirmed tickets with email and metadata (for verification_id matching)
    // No filter by email - avoids case-sensitivity issues with PostgREST's .in()
    // and potential 414 URL-length problems
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('email, metadata')
      .eq('status', 'confirmed');

    const ticketLookupFailed = !!ticketsError;
    if (ticketsError) {
      log.error('Error fetching tickets for verification matching', ticketsError);
    }

    // Create lookup structures for matching:
    // 1. Set of emails (case-insensitive) for email-based matching
    // 2. Set of verification IDs for exact matching (preferred when available)
    const purchasedEmails = new Set(
      (tickets ?? []).map((t) => t.email.toLowerCase())
    );
    const purchasedVerificationIds = new Set(
      (tickets ?? [])
        .map((t) => {
          const metadata = t.metadata as Record<string, unknown> | null;
          return metadata?.verification_id as string | undefined;
        })
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );

    // Add has_purchased_ticket flag to each verification (null if lookup failed)
    // Prefer verification_id match (exact) over email match (may differ if
    // the buyer used a different email at checkout than on their verification)
    const addPurchaseStatus = (v: (typeof allVerifications)[number]) => ({
      ...v,
      has_purchased_ticket: ticketLookupFailed
        ? null
        : purchasedVerificationIds.has(v.id) || purchasedEmails.has(v.email.toLowerCase()),
    });

    const allWithPurchaseStatus = allVerifications.map(addPurchaseStatus);

    // Compute global stats from ALL verifications (not filtered)
    const stats = {
      total: allWithPurchaseStatus.length,
      pending: allWithPurchaseStatus.filter((v) => v.status === 'pending').length,
      approved: allWithPurchaseStatus.filter((v) => v.status === 'approved').length,
      rejected: allWithPurchaseStatus.filter((v) => v.status === 'rejected').length,
      purchased: ticketLookupFailed ? 0 : allWithPurchaseStatus.filter((v) => v.has_purchased_ticket).length,
      approvedNotPurchased: ticketLookupFailed
        ? 0
        : allWithPurchaseStatus.filter((v) => v.status === 'approved' && !v.has_purchased_ticket).length,
    };

    // Apply status filter if provided
    const verifications =
      status && typeof status === 'string'
        ? allWithPurchaseStatus.filter((v) => v.status === status)
        : allWithPurchaseStatus;

    return res.status(200).json({ verifications, stats, ticketLookupFailed });
  } catch (error) {
    log.error('Admin verifications API error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
