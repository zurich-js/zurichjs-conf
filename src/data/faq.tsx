/**
 * Ticket FAQ copy.
 *
 * Extracted from the old `tickets.tsx`, which also carried ticket plans and
 * Stripe checkout wiring. The archive sells nothing, so only the FAQ prose
 * survives — it still answers what people ask about the 2026 edition.
 */

import type { FAQItem } from '@/components/molecules/FAQAccordion';
import { communityDayMeetup } from '@/data/public-program';

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
        <a href="/info/refund-policy" className="underline" target="_blank" rel="noopener noreferrer">
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
        <a href="mailto:hello@zurichjs.com" className="underline">
          Contact us at hello@zurichjs.com
        </a>
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
  {
    question: "Switzerland is expensive – I'm on a budget, what are my options?",
    answer: (
      <>
        Switzerland has the perception of being pricey, but there are many ways to make a trip
        here affordable – some accommodation options come out at under €100 per night. We&apos;ve
        found suitable places to stay at a range of price points across travel regions and hotel
        types. Feel free to get in touch at{' '}
        <a href="mailto:hello@zurichjs.com" className="underline">
          hello@zurichjs.com
        </a>{' '}
        if we can help you navigate how to plan the trip – whether that&apos;s accommodation,
        transport, or affordable places to eat.
      </>
    ),
  },
  {
    question: 'When is the best time to arrive and leave?',
    answer: (
      <>
        It depends on your ticket and plans! Community Day on <strong>September 9th</strong>{' '}
        isn&apos;t essential, but if you&apos;re attending a workshop on the 10th, you might as well
        arrive a day early and enjoy the warm-up meetup — check out the{' '}
        <a
          href={communityDayMeetup.agendaUrl}
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          agenda
        </a>{' '}
        and{' '}
        <a
          href={communityDayMeetup.rsvpUrl}
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          RSVP on Meetup
        </a>
        . For departures, a flight on{' '}
        <strong>September 12th</strong>{' '}works well — there&apos;s nothing scheduled that day, so
        you&apos;re free to head home whenever suits you. If you&apos;re a{' '}
        <strong>VIP ticket holder</strong>, note that the exclusive after party takes place on the
        evening of September 11th, so don&apos;t book too early a departure that day!
      </>
    ),
  },
];
