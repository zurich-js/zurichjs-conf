import { LucideIcon, Users, Building2, TrendingUp, Heart, Lightbulb, Handshake, Target } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface SponsorshipHeroData {
  title: string;
}

export interface SponsorshipMissionData {
  kicker: string;
  title: string;
  leftColumn: string[];
  rightColumn: string[];
}

export interface AudienceHighlightStat {
  icon: LucideIcon;
  value: string;
  label: string;
}

export interface RoleDistribution {
  role: string;
  percentage: number;
  color: string;
}

export interface ExperienceLevel {
  label: string;
  percentage: number;
}

export interface AudienceEngagement {
  label: string;
  percentage: number;
}

export interface SponsorshipAudienceData {
  kicker: string;
  title: string;
  description: string[];
  highlightStats: AudienceHighlightStat[];
  conclusion: string;
  roleDistribution: RoleDistribution[];
  experienceLevels: ExperienceLevel[];
  engagement: AudienceEngagement;
  interests: string[];
}

export interface SponsorshipValueData {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface SponsorshipValuesData {
  kicker: string;
  title: string;
  values: SponsorshipValueData[];
}

export interface TierBenefit {
  label: string;
  /** Add-on credit value (currency-specific) - if present, currency will be appended */
  addOnCredit?: {
    CHF: number;
    EUR: number;
  };
}

export interface SponsorshipTier {
  id: string;
  name: string;
  description: string;
  price: {
    CHF: number;
    EUR: number;
  };
  benefits: TierBenefit[];
  highlighted?: boolean;
}

export interface SponsorshipTiersData {
  kicker: string;
  title: string;
  tiers: SponsorshipTier[];
  cta: {
    label: string;
    href: string;
  };
}

export interface ContactInfo {
  title: string;
  email: string;
}

export interface SponsorshipContactData {
  kicker: string;
  title: string;
  contacts: ContactInfo[];
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface SponsorshipPageData {
  hero: SponsorshipHeroData;
  mission: SponsorshipMissionData;
  audience: SponsorshipAudienceData;
  values: SponsorshipValuesData;
  tiers: SponsorshipTiersData;
  contact: SponsorshipContactData;
}

// ============================================================================
// Data
// ============================================================================

export const sponsorshipPageData: SponsorshipPageData = {
  hero: {
    title: 'Partner with ZurichJS',
  },
  mission: {
    kicker: 'YOUR SUPPORT',
    title: "Expand Zurich's Tech scene across borders",
    leftColumn: [
      'ZurichJS is a <span class="underline">registered non-profit</span> under the Swiss JavaScript Group. Every sponsorship is reinvested into venues, speaker travel, workshops, and the infrastructure that keeps the community running. By sponsoring, you help us keep events accessible, bring in international expertise, and create opportunities for developers at all levels.',
      'Your support also strengthens your own position. Sponsorship makes your company visible in a trusted setting, where <span class="underline">recognition carries more weight than traditional advertising</span>. Developers see who invests in their ecosystem, and that visibility translates into credibility and trust.',
    ],
    rightColumn: [
      'Our role as organizers is to connect people. Sponsors meet developers, speakers meet new audiences, and attendees meet peers, they wouldn\'t normally cross paths with. These connections are what give ZurichJS its long-term value.',
      'In 2026, ZurichJS expands from meetups and workshops into a full international conference. Sponsors can choose to focus on the local grassroots community, reach a wider European audience, or combine both.',
    ],
  },
  audience: {
    kicker: 'THE TEAM',
    title: 'Our typical Audience',
    description: [
      "Since this is the first ZurichJS conference, we can't show you past editions accomplishments. As such, we think it's useful to see the local interest: the meetup attendee profile speaks to that.",
      'Over 75% of attendees are full-stack or frontend engineers, with nearly 40% in senior roles. A majority (60%+) have 5 or more years of experience.',
    ],
    highlightStats: [
      { icon: Users, value: '75%+', label: 'Full-Stack & Frontend Engineers' },
      { icon: Building2, value: '40%', label: 'Senior Roles' },
      { icon: TrendingUp, value: '60%+', label: '5+ Years Experience' },
    ],
    conclusion: 'That means you can easily connect directly with highly skilled developers who directly shape products and companies.',
    roleDistribution: [
      { role: 'Fullstack Engineer', percentage: 50.7, color: '#1e3a5f' },
      { role: 'Frontend Engineer', percentage: 25.3, color: '#4a6fa5' },
      { role: 'Engineering Manager', percentage: 9.9, color: '#8b5cf6' },
      { role: 'Backend Engineer', percentage: 5.6, color: '#d946ef' },
      { role: 'Student', percentage: 4.2, color: '#ec4899' },
      { role: 'Other', percentage: 2.8, color: '#f97316' },
      { role: 'DevOps', percentage: 1.4, color: '#eab308' },
    ],
    experienceLevels: [
      { label: '8+ years', percentage: 31.86 },
      { label: '4-6 years', percentage: 35.17 },
      { label: '<4 years', percentage: 32.96 },
    ],
    engagement: {
      label: 'Passionate about JS and web dev',
      percentage: 100,
    },
    interests: [
      'TypeScript',
      'React',
      'Node.js',
      'Next.js',
      'Performance',
      'AI Integration',
      'Testing',
      'TailwindCSS',
      'GraphQL',
      'DevOps',
    ],
  },
  values: {
    kicker: 'OUR VALUES',
    title: 'What we stand for',
    values: [
      {
        icon: Heart,
        title: 'Community First',
        description: 'We put our community at the heart of everything we do, fostering an inclusive and welcoming environment for all.',
      },
      {
        icon: Lightbulb,
        title: 'Knowledge Sharing',
        description: 'We believe in the power of shared learning and open collaboration to drive innovation and growth.',
      },
      {
        icon: Handshake,
        title: 'Authentic Partnerships',
        description: 'We build genuine relationships with sponsors who share our values and want to contribute meaningfully to the community.',
      },
      {
        icon: Target,
        title: 'Transparency',
        description: 'We operate with full transparency, ensuring sponsors know exactly how their support impacts the community.',
      },
    ],
  },
  tiers: {
    kicker: 'GET INVOLVED',
    title: 'Share your brand with experienced developers',
    tiers: [
      {
        id: 'diamond',
        name: 'Diamond',
        description: 'Ultimate visibility and premium brand placement',
        price: { CHF: 12000, EUR: 12500 },
        benefits: [
          { label: '10 conference tickets' },
          { label: '5 reserved workshop seats' },
          { label: '60 sec video ad rotation' },
          { label: '5 min stage slot' },
          { label: 'Add-on credit', addOnCredit: { CHF: 5000, EUR: 5000 } },
        ],
        highlighted: true,
      },
      {
        id: 'platinum',
        name: 'Platinum',
        description: 'Maximum exposure and brand recognition',
        price: { CHF: 9000, EUR: 9500 },
        benefits: [
          { label: '8 conference tickets' },
          { label: '3 reserved workshop seats' },
          { label: '30 sec video ad rotation' },
          { label: '2 min stage slot' },
          { label: 'Add-on credit', addOnCredit: { CHF: 4000, EUR: 4000 } },
        ],
      },
      {
        id: 'gold',
        name: 'Gold',
        description: 'Strong presence and engagement opportunities',
        price: { CHF: 7000, EUR: 7250 },
        benefits: [
          { label: '6 conference tickets' },
          { label: '1 reserved workshop seat' },
          { label: 'Add-on credit', addOnCredit: { CHF: 2500, EUR: 2500 } },
        ],
      },
      {
        id: 'silver',
        name: 'Silver',
        description: 'Solid brand visibility and networking',
        price: { CHF: 5000, EUR: 5000 },
        benefits: [
          { label: '4 conference tickets' },
          { label: 'Add-on credit', addOnCredit: { CHF: 1500, EUR: 1500 } },
        ],
      },
      {
        id: 'bronze',
        name: 'Bronze',
        description: 'Great entry-level sponsorship',
        price: { CHF: 2500, EUR: 2500 },
        benefits: [
          { label: '2 conference tickets' },
          { label: 'Add-on credit', addOnCredit: { CHF: 1000, EUR: 1000 } },
        ],
      },
      {
        id: 'supporter',
        name: 'Supporter',
        description: 'Show your support for the community',
        price: { CHF: 1000, EUR: 1000 },
        benefits: [
          { label: '1 conference ticket' },
        ],
      },
    ],
    cta: {
      label: 'Become a sponsor',
      href: 'mailto:hello@zurichjs.com?subject=Sponsorship%20Inquiry',
    },
  },
  contact: {
    kicker: 'GET IN TOUCH',
    title: 'Questions or feedback?',
    contacts: [
      { title: 'General Inquiries', email: 'hello@zurichjs.com' },
      { title: 'Sponsorship', email: 'hello@zurichjs.com' },
      { title: 'Speaking Opportunities', email: 'hello@zurichjs.com' },
    ],
    description: "We'd love to hear from you! Whether you have questions about the conference, want to become a sponsor, or are interested in speaking, our team is here to help.",
    ctaLabel: 'Contact us',
    ctaHref: 'mailto:hello@zurichjs.com',
  },
};
