/**
 * Ticket plans and pricing data with Stripe integration
 * Configuration for standard, VIP, and student/unemployed ticket options
 */

import type { TicketsSectionProps, Plan } from '@/components/organisms';
import type { Feature } from '@/components/molecules/FeatureList';
import type { FAQItem } from '@/components/molecules/FAQAccordion';
import type { TicketPlan } from '@/hooks/useTicketPricing';
import { redirectToCheckout } from '@/lib';

/**
 * Fixed discount expiry date to avoid hydration issues
 * Update this date manually when needed
 * Current: December 1, 2025 at midnight UTC
 */
export const DISCOUNT_EXPIRY_DATE = '2025-12-01T00:00:00.000Z';

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
    { label: 'Full conference day access', kind: 'included' as const },
    { label: 'Lunch, coffee & refreshments', kind: 'included' as const },
    { label: 'Access to networking events', kind: 'included' as const },
    { label: 'Community event (week of conf)', kind: 'included' as const },
    { label: 'Workshops (purchased separately)', kind: 'excluded' as const },
    { label: 'Refundable (see policy)', kind: 'included' as const },
  ],
  vip: [
    { label: 'Everything in Standard', kind: 'included' as const },
    { label: 'Speaker dinner invitation', kind: 'extra' as const },
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
    blurb: 'Standard features with 30% discount. Verification required.',
    footnote: 'Student ID or unemployment proof required',
    variant: 'member',
  },
  standard: {
    blurb: 'Full access + refundable. Most popular choice.',
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
    blurb: 'Everything in Standard + speaker dinner, VIP after-party, priority seating. Limited to 15 tickets.',
    footnote: 'Only 15 tickets available · Includes speaker dinner',
    variant: 'vip',
  },
};

/**
 * Stage-specific copy for heading and subcopy
 */
export const STAGE_COPY: Record<
  string,
  { heading: string; subcopy: React.ReactNode }
> = {
  blind_bird: {
    heading: 'Blind bird tickets',
    subcopy: (
      <>
        Grab the <strong>lowest possible price</strong>, before the keynote speakers are revealed.{' '}
        <strong>Save up to 40%</strong> compared to late bird pricing. <strong>Limited stock</strong>.
      </>
    ),
  },
  early_bird: {
    heading: 'Early bird tickets',
    subcopy: (
      <>
        <strong>Save now!</strong> Early bird pricing available. Secure your spot and{' '}
        <strong>save money</strong> before prices increase.
      </>
    ),
  },
  standard: {
    heading: 'Conference tickets',
    subcopy: (
      <>
        Join us for <strong>ZurichJS Conference 2026</strong>. Choose the ticket that fits your
        needs. <strong>Final chance to save</strong> before late bird pricing.
      </>
    ),
  },
  late_bird: {
    heading: 'Last chance tickets',
    subcopy: (
      <>
        <strong>Last chance</strong> to get your tickets. Don&apos;t miss out on the event of the
        year!
      </>
    ),
  },
};

/**
 * FAQ items addressing common objections and concerns
 */
export const TICKET_FAQ: FAQItem[] = [
  {
    question: 'Is the ticket price worth it for one day?',
    answer: (
      <>
        Yes! Your ticket includes full conference access, lunch, coffee & refreshments throughout
        the day, access to networking events, and a community event during the week of the
        conference. Comparable conferences charge 800-1200 CHF, making ZurichJS Conference
        excellent value.
      </>
    ),
  },
  {
    question: "What if I can't attend?",
    answer: (
      <>
        Standard and VIP tickets are refundable depending on timing:
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>More than 60 days before: 80% refund</li>
          <li>30-60 days before: 50% refund</li>
          <li>Less than 30 days: No refund, but you can transfer to a colleague for free</li>
        </ul>
        Student/Unemployed tickets follow the same refund policy as Standard tickets.{' '}
        <a href="/refund-policy" className="underline" target="_blank" rel="noopener noreferrer">
          View full refund policy ↗
        </a>
      </>
    ),
  },
  {
    question: 'Is the VIP ticket worth the extra cost?',
    answer: (
      <>
        Absolutely! The VIP ticket includes everything in Standard plus:
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Private speaker dinner (150+ CHF value alone)</li>
          <li>Exclusive VIP after-party at a rooftop bar</li>
          <li>Priority seating in the main hall</li>
          <li>Networking with only 15 top attendees</li>
        </ul>
        Limited to just 15 tickets, VIP offers unparalleled access to speakers and key figures in
        the JavaScript community.
      </>
    ),
  },
  {
    question: 'Do you offer team or bulk discounts?',
    answer: (
      <>
        Yes! We offer team packages with discounts:
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Team 3-pack: 10% off per seat</li>
          <li>Team 5-pack: 15% off per seat</li>
          <li>Team 10+: Contact us for custom pricing</li>
        </ul>
        Team packs include simplified invoicing and flexible seat management.{' '}
        <a href="/contact" className="underline">
          Contact us for team pricing
        </a>
      </>
    ),
  },
  {
    question: 'How do I verify my student or unemployed status?',
    answer: (
      <>
        Select the Student/Unemployed ticket option and you&apos;ll be guided through a
        verification process. You&apos;ll need to provide:
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Students: Valid student ID or enrollment certificate</li>
          <li>Unemployed: LinkedIn profile or unemployment documentation</li>
        </ul>
        Once verified, you&apos;ll receive a 30% discount on Standard tickets. We&apos;re
        committed to making the conference accessible to the entire community.
      </>
    ),
  },
  {
    question: 'Will prices increase?',
    answer: (
      <>
        Yes. We have four pricing stages:
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Blind Bird (lowest price, before keynote announcement)</li>
          <li>Early Bird (save 15-20% vs standard pricing)</li>
          <li>Standard (regular pricing)</li>
          <li>Late Bird (highest price, close to event date)</li>
        </ul>
        Early Bird tickets save you up to 300 CHF compared to Late Bird pricing. Book early to
        secure the best price.
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
        Yes! All ticket types can be transferred to another person for free up to 7 days before the
        event. Simply email us at{' '}
        <a href="mailto:tickets@zurichjs.com" className="underline">
          tickets@zurichjs.com
        </a>{' '}
        with your order number and the new attendee&apos;s details. Note: Student/Unemployed
        tickets can only be transferred to someone who also qualifies for the discount.
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
  openCart?: () => void
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
          // Add to cart instead of direct checkout
          if (addToCart && openCart) {
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
            openCart();
          } else {
            // Fallback to direct checkout if cart is not available
            redirectToCheckout(stripePlan.priceId);
          }
        }
      },
      label: isStudentUnemployed ? 'Verify & Get Ticket' : 'Add to Cart',
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
  openCart?: () => void
): Omit<TicketsSectionProps, 'className'> => {
  const plans = stripePlans.map((plan) => 
    mapStripePlanToTicketPlan(plan, openVerificationModal, addToCart, openCart)
  );
  const stageCopy = STAGE_COPY[currentStage] || STAGE_COPY.standard;

  return {
    kicker: 'TICKETS',
    heading: stageCopy.heading,
    subcopy: stageCopy.subcopy,
    discountEndsAt: currentStage === 'blind_bird' ? DISCOUNT_EXPIRY_DATE : undefined,
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
      blurb: 'Standard features with 30% discount. Verification required.',
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
      blurb: 'Full access + refundable. Most popular choice.',
      comparePrice: 799,
      price: 699,
      currency: 'CHF',
      variant: 'standard' as const,
      features: TICKET_FEATURES.standard,
      badge: 'Most Popular',
      cta: {
        type: 'button' as const,
        onClick: () => console.log('Standard ticket clicked'),
        label: 'Get Standard Ticket',
      },
    },
    {
      id: 'vip',
      title: 'VIP',
      blurb: 'Everything in Standard + speaker dinner, VIP after-party, priority seating. Limited to 15 tickets.',
      comparePrice: 1099,
      price: 899,
      currency: 'CHF',
      variant: 'vip' as const,
      features: TICKET_FEATURES.vip,
      cta: {
        type: 'button' as const,
        onClick: () => console.log('VIP ticket clicked'),
        label: 'Get VIP Ticket',
      },
    },
  ],
};

