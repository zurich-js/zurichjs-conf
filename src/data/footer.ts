import { SiteFooterProps } from '@/components/organisms/SiteFooter';
import { subscribeToNewsletter } from '@/lib/api/newsletter';

/**
 * Footer data for ZurichJS Conference site
 * All static content for the site footer
 */
export const footerData: SiteFooterProps = {
  about: {
    title: 'ZurichJS',
    copy: 'Our mission is to be the #1 JavaScript resource for developers in the Zurich tech scene, offering everything from meetups and workshops, to creating unparalleled networking opportunities, while making sure everybody feels welcome and included.',
    orgNote: 'Zurich JS Conf is part of the Swiss JavaScript Group, a non-profit association registered in Switzerland. © 2025 Swiss JavaScript Group (CHE-255.581.547). All rights reserved',
    moreHref: '/about',
  },
  conference: {
    title: 'Conference',
    links: [
      { label: 'Speakers', href: '/speakers', locked: true },
      { label: 'Full schedule', href: '/schedule', locked: true },
      { label: 'Sponsor us', href: 'mailto@hello@zurichjs.com', locked: true },
      { label: 'Volunteer', href: 'https://zurichjs.com/cfv', locked: true },
    ],
  },
  legal: {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/info/terms-of-service' },
      { label: 'Privacy Policy', href: '/info/privacy-policy' },
      { label: 'Refund Policy', href: '/refund-policy' },
      { label: 'Code of Conduct', href: '/info/code-of-conduct' },
    ],
  },
  newsletter: {
    title: 'Stay in the know',
    copy: 'Get updates about speakers, schedule, and early bird tickets.',
    ctaLabel: 'Sign up',
    onSubscribe: async (email: string) => {
      await subscribeToNewsletter({
        email,
        source: 'footer',
      });
    },
    privacyHref: 'https://zurichjs.com/policies/privacy-policy',
  },
  socials: [
    {
      kind: 'linkedin',
      href: 'https://www.linkedin.com/company/zurichjs',
      label: 'Follow ZurichJS on LinkedIn',
    },
    {
      kind: 'instagram',
      href: 'https://www.instagram.com/zurich.js',
      label: 'Follow ZurichJS on Instagram',
    },
  ],
} as const;

