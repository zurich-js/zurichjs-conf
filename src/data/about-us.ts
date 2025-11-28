import { ReactNode } from "react";

export interface AboutHeroData {
  title: string;
}

export interface AboutMissionData {
  kicker: string;
  title: string;
  leftColumn: string[];
  rightColumn: string[];
}

export interface AboutStatData {
  value: string;
  label: string;
}

export interface AboutTeamMemberData {
  imageSrc?: string;
  imageAlt: string;
  name: string;
  role: string;
}

export interface AboutTeamData {
  kicker: string;
  title: string;
  description: string;
  members: AboutTeamMemberData[];
  volunteersTitle: string;
  volunteersDescription: string;
  volunteers: string[];
}

export interface AboutVenueData {
  kicker: string;
  title: string;
  description: string[];
  mapUrl: string;
  address: {
    description: string;
    street: string;
    city: string;
    country: string;
  };
  directionsUrl: string;
  websiteUrl: string;
}

export interface AboutValueData {
  icon: ReactNode;
  title: string;
  description: string;
}

export interface AboutValuesData {
  kicker: string;
  title: string;
  values: AboutValueData[];
}

export interface AboutCTAButton {
  text: string;
  url: string;
  variant?: "primary" | "dark" | "ghost" | "outline" | "accent";
}

export interface AboutCTASlide {
  kicker: string;
  title: string;
  leftColumn: string;
  rightColumn: string[];
  buttons: AboutCTAButton[];
}

export interface AboutPageData {
  hero: AboutHeroData;
  mission: AboutMissionData;
  stats: AboutStatData[];
  team: AboutTeamData;
  venue: AboutVenueData;
  values: AboutValuesData;
  ctaSlides: AboutCTASlide[];
}

export const aboutPageData: AboutPageData = {
  hero: {
    title: "This is ZurichJS.",
  },
  mission: {
    kicker: "Our Mission",
    title: "Building the future of Javascript together",
    leftColumn: [
      "Zurich JS Conf is the premier JavaScript conference in Switzerland, bringing together developers, designers, and technology enthusiasts from around the world. Our mission is to foster innovation, share knowledge, and build a stronger JavaScript community.",
      "Since its inception, Zurich JS Conf has been dedicated to showcasing the latest trends, best practices, and cutting-edge technologies in the JavaScript ecosystem. From frontend frameworks to backend solutions, we cover it all.",
    ],
    rightColumn: [
      "We believe in the power of community-driven learning and collaboration. Through engaging talks, hands-on workshops, and networking opportunities, we create an environment where ideas flourish and connections are made.",
      "Join us for three days of inspiration, learning, and connection as we explore the future of web development together.",
    ],
  },
  stats: [
    { value: "300", label: "attendees" },
    { value: "20+", label: "speakers" },
    { value: "3", label: "days" },
    { value: "5+", label: "workshops" },
  ],
  team: {
    kicker: "the team",
    title: "Meet the team",
    description:
      "Our passionate team of organizers and volunteers work tirelessly to bring you the best JavaScript conference experience.",
    members: [
      {
        imageSrc: '/images/team/faris.png',
        imageAlt: 'Faris Aziz',
        name: 'Faris Aziz',
        role: 'Staff Software Engineer at Smallpdf, Conference Speaker, Workshop Instructor',
      },
      {
        imageSrc: '/images/team/nadja.png',
        imageAlt: 'Nadja Hesselbjerg',
        name: 'Nadja Hesselbjerg',
        role: 'Full-Stack/Frontend Engineer, UI/UX',
      },
      {
        imageSrc: '/images/team/bogdan.png',
        imageAlt: 'Bogdan Mihai Ilie',
        name: 'Bogdan Mihai Ilie',
        role: 'Full-Stack/Frontend Engineer, Advocate, Community builder',
      },
    ],
    volunteersTitle: "And our amazing volunteers",
    volunteersDescription:
      "None of this would be possible without our incredible volunteers who dedicate their time and energy to make this conference a success.",
    volunteers: [
      'Colin Schwarz',
      'Aleksej Dix',
      'Aldous Waites',
      'Hugo Sousa',
      'Jan Schwarzkopf',
    ],
  },
  venue: {
    kicker: "the venue",
    title: "Technopark Zürich",
    description: [
      "Technopark Zürich is Switzerland's largest technology center, located in the heart of Zurich's innovation district. This modern facility provides the perfect backdrop for our conference.",
      "With state-of-the-art facilities and excellent transportation connections, Technopark offers an inspiring environment for learning, networking, and collaboration.",
      "The venue features modern conference rooms, comfortable seating, and all the amenities needed for a world-class technology conference.",
      "Located just minutes from Zurich's main train station, the venue is easily accessible by public transportation and offers parking facilities for those arriving by car.",
    ],
    mapUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2701.234567890123!2d8.5167!3d47.3833!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDfCsDIyJzU5LjkiTiA4wrAzMScwMC4xIkU!5e0!3m2!1sen!2sch!4v1234567890123",
    address: {
      description: "Adress",
      street: "Technoparkstrasse 1",
      city: "8005 Zürich",
      country: "Switzerland",
    },
    directionsUrl: "https://maps.google.com",
    websiteUrl: "https://technopark.ch",
  },
  values: {
    kicker: "Our Values",
    title: "What we stand for",
    values: [
      {
        icon: null,
        title: "Community First",
        description:
          "We believe in building a strong, inclusive community where everyone feels welcome and valued. Our conference is a place for learning, sharing, and growing together.",
      },
      {
        icon: null,
        title: "Innovation & Learning",
        description:
          "We promote cutting-edge technologies and encourage continuous learning. Every session is designed to inspire and expand your knowledge of JavaScript.",
      },
      {
        icon: null,
        title: "Collaboration",
        description:
          "We create opportunities for meaningful connections and partnerships. Through networking events and workshops, we foster collaboration that extends beyond the conference.",
      },
      {
        icon: null,
        title: "Excellence",
        description:
          "We strive for excellence in every aspect of the conference, from speaker selection to venue quality, ensuring an outstanding experience for all attendees.",
      },
    ],
  },
  ctaSlides: [
    {
      kicker: "Join Us",
      title: "Be part of ZurichJS Conference 2026",
      leftColumn:
        "Whether you're a seasoned JavaScript developer or just starting your journey, ZurichJS Conference 2026 offers something for everyone. Join hundreds of developers, make lasting connections, and be inspired by world-class speakers.",
      rightColumn: [
        "Don't miss this opportunity to be part of Switzerland's premier JavaScript conference. Secure your spot today and join us for three unforgettable days of learning, networking, and innovation.",
        "We look forward to welcoming you to Technopark Zürich!",
      ],
      buttons: [
        {
          text: 'Get Your Ticket',
          url: '/#tickets',
          variant: 'accent',
        },
      ],
    },
    {
      kicker: "Sponsorship",
      title: "Partner with ZurichJS Conference 2026",
      leftColumn:
        "Showcase your brand to hundreds of JavaScript developers, tech leaders, and innovators. Our sponsorship packages offer unique opportunities to connect with the community, demonstrate your products, and support the growth of the JavaScript ecosystem.",
      rightColumn: [
        "From speaking opportunities to booth space, we offer flexible sponsorship tiers designed to meet your marketing goals and budget. Join leading tech companies in supporting this premier JavaScript event.",
        "Contact us today to discuss how we can create a sponsorship package that works for you.",
      ],
      buttons: [
        {
          text: "View Sponsorship Packages",
          url: "/sponsorship",
          variant: "dark",
        },
        {
          text: "Contact Us",
          url: "mailto:sponsors@zurichjs.com",
          variant: "accent",
        },
      ],
    },
  ],
};
