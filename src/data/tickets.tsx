/**
 * Ticket plans and pricing data
 * Configuration for standard, VIP, and member ticket options
 */

import type { TicketsSectionProps } from '@/components/organisms';

/**
 * Fixed discount expiry date to avoid hydration issues
 * Update this date manually when needed
 * Current: December 1, 2025 at midnight UTC
 */
const DISCOUNT_EXPIRY_DATE = '2025-12-01T00:00:00.000Z';

export const ticketsData: Omit<TicketsSectionProps, 'className'> = {
  kicker: 'TICKETS',
  heading: 'Blind tickets',
  subcopy: (
    <>
      Grab the <strong>lowest possible price</strong>, before the keynote speakers are revealed. <strong>Limited stock</strong>.
    </>
  ),
  discountEndsAt: DISCOUNT_EXPIRY_DATE,
  helpLine: {
    text: 'Are you a student or unemployed?',
    href: '/contact',
  },
  plans: [
    {
      id: 'standard',
      title: 'Standard',
      blurb: 'Perfect for developers looking to learn and network',
      comparePrice: 1200,
      price: 699,
      currency: 'CHF',
      variant: 'standard' as const,
      features: [
        { label: 'Full conference access', kind: 'included' as const },
        { label: 'All workshop sessions', kind: 'included' as const },
        { label: 'Refreshments & lunch', kind: 'included' as const },
        { label: 'Conference goodie bag', kind: 'included' as const },
        { label: 'Networking events', kind: 'included' as const },
      ],
      cta: {
        type: 'button' as const,
        onClick: () => console.log('Standard ticket clicked'),
        label: 'Get Standard Ticket',
      },
    },
    {
      id: 'vip',
      title: 'VIP',
      blurb: 'Premium experience with exclusive benefits',
      comparePrice: 1500,
      price: 899,
      currency: 'CHF',
      variant: 'vip' as const,
      features: [
        { label: 'Everything in Standard', kind: 'included' as const },
        { label: 'Speaker dinner invitation', kind: 'extra' as const },
        { label: 'VIP after-party access', kind: 'extra' as const },
        { label: 'Limited-edition swag', kind: 'extra' as const },
        { label: 'Priority seating', kind: 'extra' as const },
        { label: 'Private networking lounge', kind: 'extra' as const },
      ],
      cta: {
        type: 'button' as const,
        onClick: () => console.log('VIP ticket clicked'),
        label: 'Get VIP Ticket',
      },
    },
    {
      id: 'member',
      title: 'ZurichJS Member',
      blurb: 'Special pricing for community members',
      comparePrice: 1000,
      price: 599,
      currency: 'CHF',
      variant: 'member' as const,
      features: [
        { label: 'Everything in Standard', kind: 'included' as const },
        { label: '20% member discount', kind: 'extra' as const },
        { label: 'After-party access', kind: 'extra' as const },
        { label: 'Members-only meetup', kind: 'extra' as const },
        { label: 'Early bird priority', kind: 'extra' as const },
      ],
      cta: {
        type: 'button' as const,
        onClick: () => console.log('Member ticket clicked'),
        label: 'Get Member Ticket',
      },
      footnote: 'Valid ZurichJS membership required',
    },
  ],
};

