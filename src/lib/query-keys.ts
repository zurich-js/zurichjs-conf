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

  /**
   * Key for workshop offering pricing, currency-scoped.
   * Pass `sessionSlug` or `cfpSubmissionId` to scope to a single workshop.
   */
  pricing: (params?: {
    currency?: SupportedCurrency;
    slug?: string;
    sessionSlug?: string;
    cfpSubmissionId?: string;
  }) =>
    [
      ...workshopsKeys.all,
      'pricing',
      params?.currency ?? 'CHF',
      params?.cfpSubmissionId ?? params?.sessionSlug ?? params?.slug ?? 'all',
    ] as const,

  /**
   * Key for the combined workshops schedule + offerings query used by /workshops.
   */
  schedule: (currency?: SupportedCurrency) =>
    [...workshopsKeys.all, 'schedule', currency ?? 'CHF'] as const,
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
    dashboardBase: () => [...cfpKeys.reviewer.all(), 'dashboard'] as const,
    dashboard: (search?: string) => [...cfpKeys.reviewer.dashboardBase(), search ?? ''] as const,
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
   * Public speakers list
   * Pass { featured: true } to scope the cache to featured-only speakers
   */
  public: (params?: { featured?: boolean }) =>
    [...speakersKeys.all, 'public', params ?? {}] as const,
} as const;

/**
 * Program operations query keys
 */
export const programKeys = {
  all: ['program'] as const,
  sessions: (params?: { status?: string; kind?: string; includeArchived?: boolean }) =>
    [...programKeys.all, 'sessions', params ?? {}] as const,
  session: (id: string) => [...programKeys.all, 'session', id] as const,
  sessionSpeakers: (id: string) => [...programKeys.session(id), 'speakers'] as const,
  scheduleItems: () => [...programKeys.all, 'schedule-items'] as const,
  workshopOffering: (sessionId: string) => [...programKeys.all, 'workshop-offering', sessionId] as const,
} as const;

/**
 * Discount query keys
 */
export const discountKeys = {
  /**
   * Base key for all discount queries
   */
  all: ['discount'] as const,

  /**
   * Key for discount status
   */
  status: () => [...discountKeys.all, 'status'] as const,
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
  program: programKeys,
  discount: discountKeys,
} as const;
