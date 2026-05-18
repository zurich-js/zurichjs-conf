/**
 * Team Detection Utilities
 *
 * Identifies work emails and counts colleagues from the same company domain.
 * Used at checkout to show social proof and post-purchase to encourage team conversions.
 */

import { FREE_EMAIL_DOMAINS } from '@/data/free-email-domains';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const log = logger.scope('Team Detection');

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/**
 * Extract the domain portion from an email address.
 * Returns null if the email is malformed.
 */
export function extractDomain(email: string): string | null {
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2 || !parts[1]) return null;
  return parts[1];
}

/**
 * Check whether a domain belongs to a free/personal email provider.
 */
export function isWorkEmail(email: string): boolean {
  const domain = extractDomain(email);
  if (!domain) return false;
  return !FREE_EMAIL_DOMAINS.has(domain);
}

/**
 * Validate that a domain string is safe for use in queries.
 */
export function isValidDomain(domain: string): boolean {
  return DOMAIN_REGEX.test(domain) && domain.length <= 253;
}

interface ColleagueResult {
  count: number;
  companyName: string | null;
}

/**
 * Count confirmed ticket holders from the same email domain.
 * Uses parameterized queries to prevent SQL injection.
 *
 * @param supabase - Service role Supabase client
 * @param domain - The work email domain to search (e.g. "acme.com")
 * @param excludeEmail - Email to exclude from count (the current buyer)
 */
export async function getColleagueCount(
  supabase: SupabaseClient,
  domain: string,
  excludeEmail?: string
): Promise<ColleagueResult> {
  if (!isValidDomain(domain)) {
    return { count: 0, companyName: null };
  }

  try {
    const domainPattern = `%@${domain}`;

    // Count colleagues with confirmed tickets from the same domain
    let query = supabase
      .from('tickets')
      .select('email, company', { count: 'exact', head: false })
      .eq('status', 'confirmed')
      .ilike('email', domainPattern);

    if (excludeEmail) {
      query = query.neq('email', excludeEmail.toLowerCase());
    }

    const { count, data, error } = await query;

    if (error) {
      log.error('Failed to query colleague count', error, { domain });
      return { count: 0, companyName: null };
    }

    // Find the most common company name for this domain
    let companyName: string | null = null;
    if (data && data.length > 0) {
      const companyCounts = new Map<string, number>();
      for (const row of data) {
        const company = (row as { company?: string }).company;
        if (company) {
          companyCounts.set(company, (companyCounts.get(company) || 0) + 1);
        }
      }

      let maxCount = 0;
      for (const [name, cnt] of companyCounts) {
        if (cnt > maxCount) {
          maxCount = cnt;
          companyName = name;
        }
      }
    }

    return { count: count ?? 0, companyName };
  } catch (error) {
    log.error('Error in getColleagueCount', error, { domain });
    return { count: 0, companyName: null };
  }
}
