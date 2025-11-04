import { Hero, ScheduleSection, TicketsSection } from "@/components/organisms";

export default function Home() {
  const handleCtaClick = () => {
    console.log('Render ticket clicked!');
    // Add your ticket rendering logic here
  };

  const speakers = [
    {
      imageSrc: undefined, // Will show silhouette placeholder
      name: undefined,
      role: undefined,
    },
    {
      imageSrc: undefined,
      name: undefined,
      role: undefined,
    },
    {
      imageSrc: undefined,
      name: undefined,
      role: undefined,
    },
    {
      imageSrc: undefined,
      name: undefined,
      role: undefined,
    },
  ];

  const scheduleData = {
    title: "JS Conference by humans, for humans",
    subtitle: "Join us for three days of community building, learning, and networking. From grassroots meetups to cutting-edge technical sessions, we're bringing together JavaScript enthusiasts from around the world.",
    aboutLink: {
      label: "More about us",
      href: "/about",
    },
    days: [
      {
        id: "community",
        label: "Community day",
        date: "September 9, 2026",
        events: [
          {
            time: "09:00 – 10:00",
            title: "Registration & Welcome Coffee",
            description: "Pick up your badge, meet fellow attendees, and enjoy refreshments as we kick off the community day.",
          },
          {
            time: "10:00 – 12:00",
            title: "Community Meetup Sessions",
            description: "Join local JavaScript user groups and regional communities for informal discussions, knowledge sharing, and networking.",
          },
          {
            time: "12:00 – 13:30",
            title: "Lunch & Open Space",
            description: "Catered lunch with open space for spontaneous discussions and unconference-style sessions.",
          },
          {
            time: "13:30 – 16:00",
            title: "Workshop: Building Inclusive Communities",
            description: "Interactive workshop on fostering diverse and welcoming tech communities, led by experienced community organizers.",
          },
          {
            time: "16:00 – 17:00",
            title: "Lightning Talks",
            description: "Quick 5-minute presentations from community members sharing projects, ideas, and experiences.",
          },
          {
            time: "18:00 – 21:00",
            title: "Community Dinner & Networking",
            description: "Casual dinner at a local venue with plenty of time to connect with other attendees.",
          },
        ],
      },
      {
        id: "warmup",
        label: "Warm-up day",
        date: "September 10, 2026",
        events: [
          {
            time: "09:00 – 09:30",
            title: "Morning Coffee & Networking",
            description: "Start your day with coffee and light conversations before the sessions begin.",
          },
          {
            time: "09:30 – 12:30",
            title: "Full-Stack TypeScript Workshop",
            description: "Deep dive into building type-safe applications from frontend to backend with the latest TypeScript features.",
          },
          {
            time: "12:30 – 14:00",
            title: "Lunch Break",
            description: "Enjoy a catered lunch and continue conversations with workshop participants.",
          },
          {
            time: "14:00 – 17:00",
            title: "Modern React Patterns Workshop",
            description: "Learn the latest React patterns including Server Components, Suspense, and advanced state management techniques.",
          },
          {
            time: "17:00 – 17:30",
            title: "Q&A with Workshop Leaders",
            description: "Open forum to ask questions and discuss implementation challenges with expert instructors.",
          },
          {
            time: "19:00 – 22:00",
            title: "Pre-Conference Party",
            description: "Celebrate the start of the conference with drinks, music, and great company at Zurich's historic venue.",
          },
        ],
      },
      {
        id: "conference",
        label: "Conference day",
        date: "September 11, 2026",
        events: [
          {
            time: "08:30 – 09:30",
            title: "Registration & Breakfast",
            description: "Final registration, breakfast buffet, and last-minute networking before the main event.",
          },
          {
            time: "09:30 – 10:00",
            title: "Opening Keynote",
            description: "Welcome address and vision for the future of JavaScript development from industry leaders.",
          },
          {
            time: "10:00 – 11:00",
            title: "Technical Keynote: The Future of Web Performance",
            description: "Exploring cutting-edge performance optimization techniques and what's coming in browser engines.",
          },
          {
            time: "11:00 – 11:30",
            title: "Coffee Break",
            description: "Refreshments and networking in the exhibition hall.",
          },
          {
            time: "11:30 – 13:00",
            title: "Parallel Track Sessions (4 tracks)",
            description: "Choose from sessions on React/Vue/Angular frameworks, Node.js/Deno/Bun runtimes, Testing strategies, or Web APIs.",
          },
          {
            time: "13:00 – 14:30",
            title: "Lunch & Sponsor Showcase",
            description: "Extended lunch break with sponsor booths, demos, and networking opportunities.",
          },
          {
            time: "14:30 – 16:00",
            title: "Parallel Track Sessions (4 tracks)",
            description: "Afternoon sessions covering WebAssembly, AI/ML in JS, Accessibility, and Developer Experience tools.",
          },
          {
            time: "16:00 – 16:30",
            title: "Afternoon Break",
            description: "Quick refreshment break before the final sessions.",
          },
          {
            time: "16:30 – 17:30",
            title: "Panel Discussion: The State of JavaScript",
            description: "Industry experts discuss current trends, challenges, and the evolving JavaScript ecosystem.",
          },
          {
            time: "17:30 – 18:00",
            title: "Closing Remarks & Prize Draw",
            description: "Conference wrap-up, thank you to sponsors, and prize drawings for attendees.",
          },
          {
            time: "18:30 – 23:00",
            title: "After Party",
            description: "Official conference after-party with food, drinks, and entertainment to celebrate a successful event.",
          },
        ],
      },
    ],
  };

  // Ticket plans data
  const ticketPlans = [
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
  ];

  // Set discount to expire 50 days from now
  const discountExpiry = new Date();
  discountExpiry.setDate(discountExpiry.getDate() + 50);

  return (
    <>
      <Hero
        title="Zurich JS Conf 2026"
        kicker="The International Community Conference"
        dateTimeISO="2026-09-11T08:30:00+02:00"
        venue="Technopark Zurich"
        city="Switzerland"
        ctaLabel="Render ticket"
        onCtaClick={handleCtaClick}
        speakers={speakers}
        background={{
          // videoSrc: "/video/zurich-aerial.mp4",
          posterSrc: "/images/technopark.png",
          // imgFallbackSrc: "/images/zurich-fallback.jpg",
        }}
      />
      
      <ScheduleSection
        title={scheduleData.title}
        subtitle={scheduleData.subtitle}
        aboutLink={scheduleData.aboutLink}
        days={scheduleData.days}
      />

      <TicketsSection
        kicker="TICKETS"
        heading="Blind tickets"
        subcopy={
          <>
            Grab the <strong>lowest possible price</strong>, before the keynote speakers are revealed. <strong>Limited stock</strong>.
          </>
        }
        plans={ticketPlans}
        discountEndsAt={discountExpiry.toISOString()}
        helpLine={{
          text: 'Are you a student or unemployed?',
          href: '/contact',
        }}
      />
    </>
  );
}
