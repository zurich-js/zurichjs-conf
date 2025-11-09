/**
 * Conference timeline data
 * Important dates and milestones leading up to the conference
 */

import type { TimelineSectionProps } from '@/components/organisms';

export const timelineData: Omit<TimelineSectionProps, 'className'> = {
  kicker: 'TIMELINE',
  title: 'Your journey to ZurichJS Conf',
  copy: 'Stay up to date with all important dates and milestones leading up to the conference. Mark your calendar for ticket sales, speaker announcements, and more.',
  entries: [
    {
      id: 'announcement-blindbird',
      dateISO: '2025-11-14',
      title: 'Blind tickets go on sale',
      icon: 'ticket',
      body: 'We\'re releasing X # of tickets before we announce speakers. This is the lowest possible price point for what is already the most affordable conference in zurich?\n\nOnce sold out, Early bird tickets become available.',
      tags: [
        { label: '-30%', tone: 'accent' },
        { label: 'Limited stock', tone: 'warning' },
      ],
      href: '#tickets',
      emphasis: true,
    },
    {
      id: 'initial-speakers-early-bird',
      dateISO: '2026-01-01',
      title: 'Early Bird tickets go on sale',
      icon: 'ticket',
      body: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Donec odio. Quisque volutpat mattis eros. Nullam malesuada erat ut turpis. Suspendisse urna nibh viverra non semper suscipit posuere a pede.',
      tags: [
        { label: '-12%', tone: 'accent' },
      ],
      href: '#tickets',
      emphasis: true,
    },
    {
      id: 'cfp-starts',
      dateISO: '2026-01-01',
      title: 'Call for Papers starts',
      icon: 'flag',
      body: 'If you were looking to speak at the conference, bla bla bla',
    },
    {
      id: 'cfp-ends',
      dateISO: '2026-04-01',
      title: 'Call for Papers ends',
      icon: 'flag',
      body: '',
    },
    {
      id: 'speaker-review',
      dateISO: '2026-05-01',
      title: 'Speaker submissions review deadline',
      icon: 'flag',
      body: '',
    },
    {
      id: 'full-lineup-standard-tickets',
      dateISO: '2026-05-15',
      title: 'General Admission tickets',
      icon: 'ticket',
      body: 'Lorem ipsum dolor sit amet',
      href: '#tickets',
      emphasis: true,
    },
    {
      id: 'late-bird',
      dateISO: '2026-08-01',
      title: 'Late sale tickets',
      icon: 'ticket',
      body: '',
      href: '#tickets',
      emphasis: true,
    },
    {
      id: 'conference-events',
      dateISO: '2026-09-09',
      title: 'Zurich JS Conf events',
      icon: 'flag',
      body: '',
      emphasis: true,
    },
  ],
};

