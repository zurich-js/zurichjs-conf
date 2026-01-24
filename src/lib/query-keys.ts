/**
 * Query key factories for TanStack Query
 * Centralized management of all query keys
 */

import type { SupportedCurrency } from '@/config/currency';

/**
 * Tickets query keys
 */
export const ticketsKeys = {
  /**
   * Base key for all ticket queries
   */
  all: ['tickets'] as const,

  /**
   * Key for pricing queries
   * Includes currency for proper cache separation between CHF and EUR
   */
  pricing: (currency: SupportedCurrency = 'CHF') =>
    [...ticketsKeys.all, 'pricing', currency] as const,
} as const;

/**
 * Checkout query keys
 */
export const checkoutKeys = {
  /**
   * Base key for all checkout queries
   */
  all: ['checkout'] as const,

  /**
   * Key for session queries
   */
  sessions: () => [...checkoutKeys.all, 'session'] as const,
  session: (sessionId: string) => [...checkoutKeys.sessions(), sessionId] as const,
} as const;

/**
 * Workshops query keys
 */
export const workshopsKeys = {
  /**
   * Base key for all workshop queries
   */
  all: ['workshops'] as const,

  /**
   * Key for vouchers queries
   */
  vouchers: () => [...workshopsKeys.all, 'vouchers'] as const,
} as const;

/**
 * Team request query keys
 */
export const teamRequestKeys = {
  /**
   * Base key for all team request queries
   */
  all: ['team-request'] as const,

  /**
   * Key for team request mutations
   */
  submit: () => [...teamRequestKeys.all, 'submit'] as const,
} as const;

/**
 * CFP (Call for Papers) query keys
 */
export const cfpKeys = {
  /**
   * Base key for all CFP queries
   */
  all: ['cfp'] as const,

  /**
   * Speaker profile
   */
  speaker: () => [...cfpKeys.all, 'speaker'] as const,

  /**
   * Submissions
   */
  submissions: () => [...cfpKeys.all, 'submissions'] as const,
  submission: (id: string) => [...cfpKeys.submissions(), id] as const,

  /**
   * Suggested tags for submissions
   */
  suggestedTags: () => [...cfpKeys.all, 'suggested-tags'] as const,

  /**
   * Travel management
   */
  travel: () => [...cfpKeys.all, 'travel'] as const,
  flights: () => [...cfpKeys.travel(), 'flights'] as const,
  reimbursements: () => [...cfpKeys.travel(), 'reimbursements'] as const,

  /**
   * Reviewer
   */
  reviewer: {
    all: () => [...cfpKeys.all, 'reviewer'] as const,
    dashboard: () => [...cfpKeys.reviewer.all(), 'dashboard'] as const,
    submission: (id: string) => [...cfpKeys.reviewer.all(), 'submission', id] as const,
  },
} as const;

/**
 * Sponsorship query keys
 */
export const sponsorshipKeys = {
  /**
   * Base key for all sponsorship queries
   */
  all: ['sponsorships'] as const,

  /**
   * Tiers list
   */
  tiers: () => [...sponsorshipKeys.all, 'tiers'] as const,

  /**
   * Stats
   */
  stats: () => [...sponsorshipKeys.all, 'stats'] as const,

  /**
   * Deals
   */
  deals: (filters?: { status?: string; tier?: string; currency?: string; search?: string }) =>
    [...sponsorshipKeys.all, 'deals', filters] as const,
  deal: (id: string) => [...sponsorshipKeys.all, 'deal', id] as const,

  /**
   * Sponsors
   */
  sponsors: () => [...sponsorshipKeys.all, 'sponsors'] as const,
  sponsor: (id: string) => [...sponsorshipKeys.sponsors(), id] as const,

  /**
   * Public sponsors (for homepage)
   */
  public: () => [...sponsorshipKeys.all, 'public'] as const,
} as const;

/**
 * Partnership query keys
 */
export const partnershipKeys = {
  /**
   * Base key for all partnership queries
   */
  all: ['partnerships'] as const,

  /**
   * Community partners (for homepage)
   */
  community: () => [...partnershipKeys.all, 'community'] as const,
} as const;

/**
 * Speakers query keys (public)
 */
export const speakersKeys = {
  /**
   * Base key for all speaker queries
   */
  all: ['speakers'] as const,

  /**
   * Public speakers list (for homepage)
   */
  public: () => [...speakersKeys.all, 'public'] as const,
} as const;

/**
 * All query keys organized by domain
 */
export const queryKeys = {
  tickets: ticketsKeys,
  checkout: checkoutKeys,
  workshops: workshopsKeys,
  teamRequest: teamRequestKeys,
  cfp: cfpKeys,
  sponsorships: sponsorshipKeys,
  partnerships: partnershipKeys,
  speakers: speakersKeys,
} as const;

