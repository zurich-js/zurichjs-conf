/**
 * Conference schedule data
 * Three-day conference schedule with community, warm-up, and main conference days
 */

import type { ScheduleSectionProps } from '@/components/organisms';

export const scheduleData: Omit<ScheduleSectionProps, 'className'> = {
  title: 'JS Conference by humans, for humans',
  subtitle: 'Join us for three days of community building, learning, and networking. From grassroots meetups to cutting-edge technical sessions, we\'re bringing together JavaScript enthusiasts from around the world.',
  aboutLink: {
    label: 'More about us',
    href: '/about',
  },
  days: [
    {
      id: 'community',
      label: 'Community day',
      date: 'September 9, 2026',
      description: 'Kick off the conference with a day dedicated to community building. Connect with local JavaScript user groups, participate in informal meetups, and engage in lightning talks. This day is all about bringing together developers from diverse backgrounds to share knowledge and build lasting connections.',
      tbaMode: false, // Set to true to show TBA mode for this day
      events: [
        {
          time: '09:00 – 10:00',
          title: 'Registration & Welcome Coffee',
          description: 'Pick up your badge, meet fellow attendees, and enjoy refreshments as we kick off the community day.',
        },
        {
          time: '10:00 – 12:00',
          title: 'Community Meetup Sessions',
          description: 'Join local JavaScript user groups and regional communities for informal discussions, knowledge sharing, and networking.',
        },
        {
          time: '12:00 – 13:30',
          title: 'Lunch & Open Space',
          description: 'Catered lunch with open space for spontaneous discussions and unconference-style sessions.',
        },
        {
          time: '13:30 – 16:00',
          title: 'Workshop: Building Inclusive Communities',
          description: 'Interactive workshop on fostering diverse and welcoming tech communities, led by experienced community organizers.',
        },
        {
          time: '16:00 – 17:00',
          title: 'Lightning Talks',
          description: 'Quick 5-minute presentations from community members sharing projects, ideas, and experiences.',
        },
        {
          time: '18:00 – 21:00',
          title: 'Community Dinner & Networking',
          description: 'Casual dinner at a local venue with plenty of time to connect with other attendees.',
        },
      ],
    },
    {
      id: 'warmup',
      label: 'Warm-up day',
      date: 'September 10, 2026',
      description: 'Prepare for the main conference with intensive hands-on workshops. Learn the latest TypeScript features and modern React patterns from expert instructors. The day concludes with a pre-conference party where you can unwind and network with fellow attendees.',
      tbaMode: true, // Set to true to show TBA mode for this day
      events: [
        {
          time: '09:00 – 09:30',
          title: 'Morning Coffee & Networking',
          description: 'Start your day with coffee and light conversations before the sessions begin.',
        },
        {
          time: '09:30 – 12:30',
          title: 'Full-Stack TypeScript Workshop',
          description: 'Deep dive into building type-safe applications from frontend to backend with the latest TypeScript features.',
        },
        {
          time: '12:30 – 14:00',
          title: 'Lunch Break',
          description: 'Enjoy a catered lunch and continue conversations with workshop participants.',
        },
        {
          time: '14:00 – 17:00',
          title: 'Modern React Patterns Workshop',
          description: 'Learn the latest React patterns including Server Components, Suspense, and advanced state management techniques.',
        },
        {
          time: '17:00 – 17:30',
          title: 'Q&A with Workshop Leaders',
          description: 'Open forum to ask questions and discuss implementation challenges with expert instructors.',
        },
        {
          time: '19:00 – 22:00',
          title: 'Pre-Conference Party',
          description: 'Celebrate the start of the conference with drinks, music, and great company at Zurich\'s historic venue.',
        },
      ],
    },
    {
      id: 'conference',
      label: 'Conference day',
      date: 'September 11, 2026',
      description: 'The main conference day featuring keynote presentations, parallel track sessions, and panel discussions. Choose from multiple tracks covering frameworks, runtimes, testing, WebAssembly, AI/ML, accessibility, and more. Network with sponsors during extended breaks and celebrate at the official after-party.',
      tbaMode: true, // Set to true to show TBA mode for this day
      events: [
        {
          time: '08:30 – 09:30',
          title: 'Registration & Breakfast',
          description: 'Final registration, breakfast buffet, and last-minute networking before the main event.',
        },
        {
          time: '09:30 – 10:00',
          title: 'Opening Keynote',
          description: 'Welcome address and vision for the future of JavaScript development from industry leaders.',
        },
        {
          time: '10:00 – 11:00',
          title: 'Technical Keynote: The Future of Web Performance',
          description: 'Exploring cutting-edge performance optimization techniques and what\'s coming in browser engines.',
        },
        {
          time: '11:00 – 11:30',
          title: 'Coffee Break',
          description: 'Refreshments and networking in the exhibition hall.',
        },
        {
          time: '11:30 – 13:00',
          title: 'Parallel Track Sessions (4 tracks)',
          description: 'Choose from sessions on React/Vue/Angular frameworks, Node.js/Deno/Bun runtimes, Testing strategies, or Web APIs.',
        },
        {
          time: '13:00 – 14:30',
          title: 'Lunch & Sponsor Showcase',
          description: 'Extended lunch break with sponsor booths, demos, and networking opportunities.',
        },
        {
          time: '14:30 – 16:00',
          title: 'Parallel Track Sessions (4 tracks)',
          description: 'Afternoon sessions covering WebAssembly, AI/ML in JS, Accessibility, and Developer Experience tools.',
        },
        {
          time: '16:00 – 16:30',
          title: 'Afternoon Break',
          description: 'Quick refreshment break before the final sessions.',
        },
        {
          time: '16:30 – 17:30',
          title: 'Panel Discussion: The State of JavaScript',
          description: 'Industry experts discuss current trends, challenges, and the evolving JavaScript ecosystem.',
        },
        {
          time: '17:30 – 18:00',
          title: 'Closing Remarks & Prize Draw',
          description: 'Conference wrap-up, thank you to sponsors, and prize drawings for attendees.',
        },
        {
          time: '18:30 – 23:00',
          title: 'After Party',
          description: 'Official conference after-party with food, drinks, and entertainment to celebrate a successful event.',
        },
      ],
    },
  ],
};

