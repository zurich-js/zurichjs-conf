/**
 * Conference schedule data
 * Drives the homepage schedule snapshot (ScheduleSection), which links out to
 * the full `/schedule` page. Only id, label, and date are rendered here — the
 * detailed per-session program lives in the database.
 */

import type { ScheduleSectionProps } from '@/components/organisms';

export const scheduleData: ScheduleSectionProps = {
  title: 'JS Conference by humans, for humans',
  subtitle: 'Join us for four days of community building, learning, and networking. From grassroots meetups to cutting-edge technical sessions, we\'re bringing together JavaScript enthusiasts from around the world.',
  aboutLink: {
    label: 'View full schedule',
    href: '/schedule',
  },
  days: [
    {
      id: 'community',
      label: 'Community Day',
      date: 'September 9, 2026',
    },
    {
      id: 'warmup',
      label: 'Zurich Engineering Day',
      date: 'September 10, 2026',
    },
    {
      id: 'conference',
      label: 'Conference Day',
      date: 'September 11, 2026',
    },
    {
      id: 'post-conference',
      label: 'Post-conf chill Day',
      date: 'September 12, 2026',
    },
  ],
};
