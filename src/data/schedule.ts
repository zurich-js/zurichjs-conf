/**
 * Conference schedule data
 * Four-day conference schedule with community, warm-up, main conference, and post-conference days
 */

import type { ScheduleSectionProps } from '@/components/organisms';

export const scheduleData: Omit<ScheduleSectionProps, 'className'> = {
  title: 'JS Conference by humans, for humans',
  subtitle: 'Join us for four days of community building, learning, and networking. From grassroots meetups to cutting-edge technical sessions, we\'re bringing together JavaScript enthusiasts from around the world.',
  aboutLink: {
    label: 'More about us',
    href: 'https://conf.zurichjs.com/about',
  },
  days: [
    {
      id: 'community',
      label: 'Community day',
      date: 'September 9, 2026',
      description: 'Kick off the conference week with a special edition warm-up meetup, regular ZurichJS style. Connect with local and visiting JavaScript developers for an evening of talks, community building, and networking.',
      tbaMode: false,
      events: [
        {
          time: '17:00 – 21:00',
          title: 'ZurichJS Special Edition Warm-up Meetup',
          description: 'A special edition of our regular ZurichJS meetup to kick off the conference week. Expect an evening of short community talks, networking, and informal discussions over food and drinks. Location TBD – centrally hosted in Zurich (not at Technopark).',
        },
      ],
    },
    {
      id: 'warmup',
      label: 'Workshop day',
      date: 'September 10, 2026',
      description: 'A full day of 6 hands-on workshops running across 2 parallel tracks. Each workshop runs 3–4 hours, covering a range of JavaScript and web development topics. All workshops are centrally hosted in Zurich.',
      tbaMode: false,
      events: [
        {
          time: '09:00 – 12:00',
          title: 'Morning Workshops',
          description: '2 workshops running in parallel. Dive deep into hands-on, instructor-led sessions covering a range of JavaScript and web development topics.',
        },
        {
          time: '12:00 – 13:00',
          title: 'Lunch Break',
          description: 'Recharge and connect with fellow workshop attendees over lunch.',
        },
        {
          time: '13:00 – 17:00',
          title: 'Afternoon Workshops',
          description: '2 workshops running in parallel. Continue learning with a fresh set of in-depth, hands-on sessions in the afternoon.',
        },
        {
          time: '19:00 – 22:00',
          title: 'Speakers Dinner',
          description: 'An exclusive dinner for speakers to connect before the main conference day.',
        },
      ],
    },
    {
      id: 'conference',
      label: 'Conference day',
      date: 'September 11, 2026',
      description: 'The main conference day featuring 14 talks (a mix of lightning and full-length sessions), 2 panel discussions during lunch, and plenty of networking. A full day of learning and celebration.',
      defaultSelected: true,
      tbaMode: false,
      events: [
        {
          time: '08:00 – 08:45',
          title: 'Doors Open & Registration',
          description: 'Arrive, check in, pick up your badge, and grab a coffee before the day kicks off.',
        },
        {
          time: '08:45 – 09:00',
          title: 'Opening Remarks',
          description: 'Welcome to ZurichJS Conf 2026! Introduction to the day and housekeeping.',
        },
        {
          time: '09:00 – 10:30',
          title: 'Morning Talks I',
          description: 'First block of talks featuring a mix of lightning and full-length sessions.',
        },
        {
          time: '10:30 – 11:00',
          title: 'Coffee Break',
          description: 'Recharge, network, and visit the sponsors area.',
        },
        {
          time: '11:00 – 12:30',
          title: 'Morning Talks II',
          description: 'Second block of talks with lightning and full-length sessions.',
        },
        {
          time: '12:30 – 13:30',
          title: 'Lunch & Panel Discussions',
          description: '2 back-to-back panel discussions (30 minutes each, 4 panelists per panel) running during the lunch break. Grab your food and enjoy the conversations.',
        },
        {
          time: '13:30 – 15:00',
          title: 'Afternoon Talks I',
          description: 'Third block of talks featuring lightning and full-length sessions.',
        },
        {
          time: '15:00 – 15:30',
          title: 'Afternoon Break',
          description: 'Last chance to recharge, network, and visit the sponsors area.',
        },
        {
          time: '15:30 – 17:30',
          title: 'Afternoon Talks II',
          description: 'Final block of talks to close out the conference programme.',
        },
        {
          time: '17:30 – 18:00',
          title: 'Closing Remarks',
          description: 'Conference wrap-up, thank yous, and closing remarks.',
        },
        {
          time: '18:00 onwards',
          title: 'Conference After Party',
          description: 'Celebrate the conference with food, drinks, and great company at the official after-party.',
        },
      ],
    },
    {
      id: 'post-conference',
      label: 'Post-conference chill day',
      date: 'September 12, 2026',
      description: 'A relaxed day exclusively for VIP ticket holders. Join speakers and fellow attendees for a day of activities around Zurich – from hiking in the Swiss Alps to exploring the city.',
      tbaMode: false,
      events: [
        {
          time: '11:00 – 17:00',
          title: 'VIP Activities',
          description: 'Exclusive activities for VIP ticket holders with conference speakers. Potential activities include hiking, touring around Zurich, and more – details to be announced.',
        },
      ],
    },
  ],
};
