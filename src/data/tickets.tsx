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
    { label: 'Everything in Standard', kind: 'extra' as const },
    { label: 'Verification required', kind: 'excluded' as const },
  ],
  standard: [
    { label: 'Access to conference', kind: 'included' as const },
    { label: 'Refreshments and lunch', kind: 'included' as const },
    { label: 'Goodie bag', kind: 'included' as const },
  ],
  vip: [
    { label: 'Everything in Standard', kind: 'extra' as const },
    { label: 'Invite to speaker city tour', kind: 'included' as const },
    { label: 'Limited edition goodies', kind: 'included' as const },
    { label: '20% discount to all workshops', kind: 'included' as const },
  ],
};

/**
 * Ticket metadata (blurbs, footnotes)
 */
export const TICKET_METADATA: Record<
  string,
  { blurb: string; variant: 'standard' | 'vip' | 'member' }
> = {
  standard_student_unemployed: {
    blurb: 'Building the future, one ticket at a time.',
    variant: 'member',
  },
  standard: {
    blurb: 'The sweet spot.',
    variant: 'standard',
  },
  vip: {
    blurb: 'For those who go all in. Limited to 15.',
    variant: 'vip',
  },
};

/**
 * Stage-specific copy for heading, subcopy, and countdown messaging
 */
export const STAGE_COPY: Record<
  string,
  {
    title: string;
    subtitle: React.ReactNode;
    countdownTitle: string;
  }
> = {
  blind_bird: {
    title: 'Blind bird tickets',
    subtitle: (
      <>
        Grab the <strong>lowest possible price</strong>, before the keynote speakers are revealed.{' '}
        <strong>Save up to 40%</strong> compared to late bird pricing. <strong>Limited&nbsp;stock</strong>.
      </>
    ),
    countdownTitle: 'Blind Bird phase ends in',
  },
  early_bird: {
    title: 'Early bird tickets',
    subtitle: (
      <>
        <strong>Save now!</strong> Early bird pricing available. Secure your spot and{' '}
        <strong>save money</strong> before prices increase.
      </>
    ),
    countdownTitle: 'Early Bird phase ends in',
  },
  standard: {
    title: 'Conference tickets',
    subtitle: (
      <>
        Join us for <strong>ZurichJS Conference 2026</strong>. Choose the ticket that fits your
        needs. <strong>Final chance to save</strong> before late bird pricing.
      </>
    ),
    countdownTitle: 'Standard pricing ends in',
  },
  late_bird: {
    title: 'Last chance tickets',
    subtitle: (
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
        All ticket sales are final. Refunds are not available except on a case-by-case basis in
        exceptional circumstances. If you have extenuating circumstances, please contact us at{' '}
        <a href="mailto:hello@zurichjs.com" className="underline">
          hello@zurichjs.com
        </a>{' '}
        and we&apos;ll review your request.{' '}
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
        <a href="mailto:hello@zurichjs.com" className="underline">
          hello@zurichjs.com
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
    cta: {
      type: 'button' as const,
      onClick: () => {
        if (isStudentUnemployed) {
          // Open verification modal
          if (openVerificationModal) {
            openVerificationModal(stripePlan.priceId);
          } else {
            // Fallback if modal is not available
            alert('Student/Unemployed verification flow will open here. Please contact hello@zurichjs.com with your student ID or unemployment proof.');
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
    title: stageCopy.title,
    subtitle: stageCopy.subtitle,
    discountEndsAt: showCountdown ? getStageEndDate() : undefined,
    countdownTitle: stageCopy.countdownTitle,
    plans,
  };
};

/**
 * Fallback ticket data (used when Stripe is not available or loading)
 */
export const ticketsData: Omit<TicketsSectionProps, 'className'> = {
  kicker: 'TICKETS',
  title: 'Conference tickets',
  subtitle: (
    <>
      Join us for <strong>ZurichJS Conference 2026</strong>. Choose the ticket that fits your
      needs.
    </>
  ),
  discountEndsAt: undefined,
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
      cta: {
        type: 'button' as const,
        onClick: () => {
          alert('Student/Unemployed verification flow will open here. Please contact hello@zurichjs.com with your student ID or unemployment proof.');
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

