/**
 * Ticket plans and pricing data with Stripe integration
 * Configuration for standard, VIP, and supersaver ticket options
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
  super_saver: [
    { label: 'Everything in Standard', kind: 'included' as const },
    { label: 'Non-refundable', kind: 'excluded' as const },
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
  super_saver: {
    blurb: 'Lowest price, no refunds. Best for committed attendees.',
    footnote: 'Non-refundable · Limited availability',
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
        Super Saver tickets are non-refundable but can be transferred to another person.{' '}
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
    question: 'Are there student or unemployed discounts?',
    answer: (
      <>
        Yes! We offer 30% discounts for students and unemployed developers. Email us at{' '}
        <a href="mailto:tickets@zurichjs.com" className="underline">
          tickets@zurichjs.com
        </a>{' '}
        with your student ID or LinkedIn profile for a discount code. We&apos;re committed to
        making the conference accessible to the entire community.
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
        Yes! All ticket types (including non-refundable Super Saver) can be transferred to another
        person for free up to 7 days before the event. Simply email us at{' '}
        <a href="mailto:tickets@zurichjs.com" className="underline">
          tickets@zurichjs.com
        </a>{' '}
        with your order number and the new attendee&apos;s details.
      </>
    ),
  },
];

/**
 * Map Stripe plan to ticket plan with features and metadata
 */
export const mapStripePlanToTicketPlan = (stripePlan: TicketPlan): Plan => {
  const features = TICKET_FEATURES[stripePlan.id] || TICKET_FEATURES.standard;
  const metadata = TICKET_METADATA[stripePlan.id] || TICKET_METADATA.standard;

  // Convert from cents to base units (Stripe stores amounts in cents)
  const price = Math.round(stripePlan.price / 100);
  const comparePrice = stripePlan.comparePrice
    ? Math.round(stripePlan.comparePrice / 100)
    : undefined;

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
        redirectToCheckout(stripePlan.priceId);
      },
      label: `Get ${stripePlan.title} Ticket`,
    },
  };
};

/**
 * Create complete ticket section data from Stripe plans
 */
export const createTicketDataFromStripe = (
  stripePlans: TicketPlan[],
  currentStage: string
): Omit<TicketsSectionProps, 'className'> => {
  const plans = stripePlans.map(mapStripePlanToTicketPlan);
  const stageCopy = STAGE_COPY[currentStage] || STAGE_COPY.standard;

  return {
    kicker: 'TICKETS',
    heading: stageCopy.heading,
    subcopy: stageCopy.subcopy,
    discountEndsAt: currentStage === 'blind_bird' ? DISCOUNT_EXPIRY_DATE : undefined,
    helpLine: {
      text: 'Are you a student or unemployed?',
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
    text: 'Are you a student or unemployed?',
    href: '/contact',
  },
  faq: TICKET_FAQ,
  plans: [
    {
      id: 'super_saver',
      title: 'Super Saver',
      blurb: 'Lowest price, no refunds. Best for committed attendees.',
      comparePrice: 699,
      price: 599,
      currency: 'CHF',
      variant: 'member' as const,
      features: TICKET_FEATURES.super_saver,
      footnote: 'Limited availability',
      cta: {
        type: 'button' as const,
        onClick: () => console.log('Super Saver ticket clicked'),
        label: 'Get Super Saver Ticket',
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

