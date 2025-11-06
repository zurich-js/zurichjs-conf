/**
 * Ticket plans and pricing data with Stripe integration
 * Configuration for standard, VIP, and student/unemployed ticket options
 */

import type { TicketsSectionProps, Plan } from '@/components/organisms';
import type { Feature } from '@/components/molecules/FeatureList';
import type { FAQItem } from '@/components/molecules/FAQAccordion';
import type { TicketPlan } from '@/hooks/useTicketPricing';
import { redirectToCheckout } from '@/lib';

import { getCurrentStageEndDate } from '@/config/pricing-stages';

/**
 * Get the current pricing stage end date for countdown display
 * This dynamically returns the end date based on the current active stage
 */
export const getStageEndDate = (): string => {
  return getCurrentStageEndDate().toISOString();
};

/**
 * Static feature definitions for each ticket type
 */
export const TICKET_FEATURES: Record<string, Feature[]> = {
  standard_student_unemployed: [
    { label: 'Everything in Standard', kind: 'included' as const },
    { label: 'Verification required', kind: 'extra' as const },
    { label: '30% discount', kind: 'extra' as const },
  ],
  standard: [
    { label: 'Full conference day (Sept 11)', kind: 'included' as const },
    { label: 'Lunch & refreshments included', kind: 'included' as const },
    { label: 'Community meetup (Sept 9)', kind: 'included' as const },
    { label: 'Networking events access', kind: 'included' as const },
    { label: 'Refundable ticket', kind: 'included' as const },
    { label: 'Workshops (separate purchase)', kind: 'excluded' as const },
  ],
  vip: [
    { label: 'Everything in Standard', kind: 'included' as const },
    { label: 'Select activities with speakers', kind: 'extra' as const },
    { label: 'More 1:1 time opportunities', kind: 'extra' as const },
    { label: 'VIP after-party access', kind: 'extra' as const },
    { label: 'Priority seating', kind: 'extra' as const },
    { label: 'Limited to 15 tickets', kind: 'extra' as const },
  ],
};

/**
 * Ticket metadata (blurbs, footnotes)
 */
export const TICKET_METADATA: Record<
  string,
  { blurb: string; footnote?: React.ReactNode; variant: 'standard' | 'vip' | 'member' }
> = {
  standard_student_unemployed: {
    blurb: 'Building the future, one ticket at a time.',
    footnote: 'Student ID or unemployment proof required',
    variant: 'member',
  },
  standard: {
    blurb: 'The sweet spot. Everything you need, nothing you don\'t.',
    footnote: (
      <>
        Refundable –{' '}
        <a
          href="/refund-policy"
          className="underline hover:text-text-muted transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          View refund policy ↗
        </a>
      </>
    ),
    variant: 'standard',
  },
  vip: {
    blurb: 'For those who go all in. Limited to 15.',
    footnote: 'Only 15 tickets available · Exclusive speaker access',
    variant: 'vip',
  },
};

/**
 * Stage-specific copy for heading, subcopy, and countdown messaging
 */
export const STAGE_COPY: Record<
  string,
  {
    heading: string;
    subcopy: React.ReactNode;
    countdownTitle: string;
  }
> = {
  blind_bird: {
    heading: 'Blind bird tickets',
    subcopy: (
      <>
        Grab the <strong>lowest possible price</strong>, before the keynote speakers are revealed.{' '}
        <strong>Save up to 40%</strong> compared to late bird pricing. <strong>Limited stock</strong>.
      </>
    ),
    countdownTitle: 'Blind Bird phase ends in',
  },
  early_bird: {
    heading: 'Early bird tickets',
    subcopy: (
      <>
        <strong>Save now!</strong> Early bird pricing available. Secure your spot and{' '}
        <strong>save money</strong> before prices increase.
      </>
    ),
    countdownTitle: 'Early Bird phase ends in',
  },
  standard: {
    heading: 'Conference tickets',
    subcopy: (
      <>
        Join us for <strong>ZurichJS Conference 2026</strong>. Choose the ticket that fits your
        needs. <strong>Final chance to save</strong> before late bird pricing.
      </>
    ),
    countdownTitle: 'Standard pricing ends in',
  },
  late_bird: {
    heading: 'Last chance tickets',
    subcopy: (
      <>
        <strong>Last chance</strong> to get your tickets. Don&apos;t miss out on the event of the
        year!
      </>
    ),
    countdownTitle: 'Sales close in',
  },
};

/**
 * FAQ items addressing common objections and concerns
 */
export const TICKET_FAQ: FAQItem[] = [
  {
    question: "What if I can't attend?",
    answer: (
      <>
        Standard and VIP tickets are refundable depending on timing:
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>More than 60 days before: 80% refund</li>
          <li>30-60 days before: 50% refund</li>
          <li>Less than 30 days: No refund</li>
        </ul>
        Student/Unemployed tickets follow the same refund policy as Standard tickets.{' '}
        <a href="/refund-policy" className="underline" target="_blank" rel="noopener noreferrer">
          View full refund policy ↗
        </a>
      </>
    ),
  },
  {
    question: 'Do you offer team or bulk discounts?',
    answer: (
      <>
        Yes! We offer team packages with custom pricing. Reach out to discuss your needs and
        we&apos;ll create a tailored package for your team. Team packages include simplified
        invoicing and bank transfer payment options.{' '}
        <a href="/contact" className="underline">
          Contact us for team pricing
        </a>
      </>
    ),
  },
  {
    question: 'Do prices include VAT? Can I get an invoice?',
    answer: (
      <>
        All prices include 8.1% Swiss VAT. Business invoices with VAT details are provided
        automatically at checkout. Swiss companies can claim back the VAT. EU companies may qualify
        for reverse charge VAT rules.
      </>
    ),
  },
  {
    question: 'Can I transfer my ticket to someone else?',
    answer: (
      <>
        Ticket transfers are evaluated on a case-by-case basis. If you need to transfer your
        ticket, email us at{' '}
        <a href="mailto:tickets@zurichjs.com" className="underline">
          tickets@zurichjs.com
        </a>{' '}
        with your order number and reason for transfer. We&apos;ll review your request and get
        back to you as soon as possible.
      </>
    ),
  },
];

/**
 * Map Stripe plan to ticket plan with features and metadata
 */
export const mapStripePlanToTicketPlan = (
  stripePlan: TicketPlan,
  openVerificationModal?: (priceId: string) => void,
  addToCart?: (item: {
    id: string;
    title: string;
    price: number;
    currency: string;
    priceId: string;
    variant?: 'standard' | 'vip' | 'member';
  }, quantity: number) => void,
  navigateToCart?: () => void
): Plan => {
  const features = TICKET_FEATURES[stripePlan.id] || TICKET_FEATURES.standard;
  const metadata = TICKET_METADATA[stripePlan.id] || TICKET_METADATA.standard;

  // Convert from cents to base units (Stripe stores amounts in cents)
  const price = Math.round(stripePlan.price / 100);
  const comparePrice = stripePlan.comparePrice
    ? Math.round(stripePlan.comparePrice / 100)
    : undefined;

  // Special handling for student/unemployed tickets - they need verification
  const isStudentUnemployed = stripePlan.id === 'standard_student_unemployed';

  return {
    id: stripePlan.id,
    title: stripePlan.title,
    blurb: metadata.blurb,
    comparePrice,
    price,
    currency: stripePlan.currency,
    features,
    variant: metadata.variant,
    footnote: metadata.footnote,
    badge: stripePlan.id === 'standard' ? 'Most Popular' : undefined,
    cta: {
      type: 'button' as const,
      onClick: () => {
        if (isStudentUnemployed) {
          // Open verification modal
          if (openVerificationModal) {
            openVerificationModal(stripePlan.priceId);
          } else {
            // Fallback if modal is not available
            alert('Student/Unemployed verification flow will open here. Please contact tickets@zurichjs.com with your student ID or unemployment proof.');
          }
        } else {
          // Add to cart and navigate to cart page
          if (addToCart && navigateToCart) {
            addToCart(
              {
                id: stripePlan.id,
                title: stripePlan.title,
                price,
                currency: stripePlan.currency,
                priceId: stripePlan.priceId,
                variant: metadata.variant,
              },
              1
            );
            navigateToCart();
          } else {
            // Fallback to direct checkout if cart is not available
            redirectToCheckout(stripePlan.priceId);
          }
        }
      },
      label: isStudentUnemployed
        ? 'Verify & Get Ticket'
        : stripePlan.id === 'vip'
          ? 'Get the full xp'
          : 'Get your ticket',
    },
  };
};

/**
 * Create complete ticket section data from Stripe plans
 */
export const createTicketDataFromStripe = (
  stripePlans: TicketPlan[],
  currentStage: string,
  openVerificationModal?: (priceId: string) => void,
  addToCart?: (item: {
    id: string;
    title: string;
    price: number;
    currency: string;
    priceId: string;
    variant?: 'standard' | 'vip' | 'member';
  }, quantity: number) => void,
  navigateToCart?: () => void
): Omit<TicketsSectionProps, 'className'> => {
  const plans = stripePlans.map((plan) =>
    mapStripePlanToTicketPlan(plan, openVerificationModal, addToCart, navigateToCart)
  );
  const stageCopy = STAGE_COPY[currentStage] || STAGE_COPY.standard;

  // Show countdown for all stages except late_bird (last stage)
  const showCountdown = currentStage !== 'late_bird';

  return {
    kicker: 'TICKETS',
    heading: stageCopy.heading,
    subcopy: stageCopy.subcopy,
    discountEndsAt: showCountdown ? getStageEndDate() : undefined,
    countdownTitle: stageCopy.countdownTitle,
    helpLine: {
      text: 'Questions about tickets?',
      href: '/contact',
    },
    plans,
    faq: TICKET_FAQ,
  };
};

/**
 * Fallback ticket data (used when Stripe is not available or loading)
 */
export const ticketsData: Omit<TicketsSectionProps, 'className'> = {
  kicker: 'TICKETS',
  heading: 'Conference tickets',
  subcopy: (
    <>
      Join us for <strong>ZurichJS Conference 2026</strong>. Choose the ticket that fits your
      needs.
    </>
  ),
  discountEndsAt: undefined,
  helpLine: {
    text: 'Questions about tickets?',
    href: '/contact',
  },
  faq: TICKET_FAQ,
  plans: [
    {
      id: 'standard_student_unemployed',
      title: 'Student / Unemployed',
      blurb: TICKET_METADATA.standard_student_unemployed.blurb,
      comparePrice: 699,
      price: 489,
      currency: 'CHF',
      variant: 'member' as const,
      features: TICKET_FEATURES.standard_student_unemployed,
      footnote: 'Student ID or unemployment proof required',
      cta: {
        type: 'button' as const,
        onClick: () => {
          alert('Student/Unemployed verification flow will open here. Please contact tickets@zurichjs.com with your student ID or unemployment proof.');
        },
        label: 'Verify & Get Ticket',
      },
    },
    {
      id: 'standard',
      title: 'Standard',
      blurb: TICKET_METADATA.standard.blurb,
      comparePrice: 799,
      price: 699,
      currency: 'CHF',
      variant: 'standard' as const,
      features: TICKET_FEATURES.standard,
      badge: 'Most Popular',
      cta: {
        type: 'button' as const,
        onClick: () => console.log('Standard ticket clicked'),
        label: 'Get your ticket',
      },
    },
    {
      id: 'vip',
      title: 'VIP',
      blurb: TICKET_METADATA.vip.blurb,
      comparePrice: 1099,
      price: 899,
      currency: 'CHF',
      variant: 'vip' as const,
      features: TICKET_FEATURES.vip,
      cta: {
        type: 'button' as const,
        onClick: () => console.log('VIP ticket clicked'),
        label: 'Get the full xp',
      },
    },
  ],
};

