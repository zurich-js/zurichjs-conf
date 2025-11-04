import { SiteFooterProps } from '@/components/organisms/SiteFooter';

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
      { label: 'Speakers', href: '/speakers' },
      { label: 'Schedule', href: '/schedule' },
      { label: 'Sponsors', href: '/sponsors' },
      { label: 'Volunteer', href: '/volunteer', locked: true },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  legal: {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Refund Policy', href: '/refund' },
      { label: 'Code of Conduct', href: '/code-of-conduct' },
    ],
  },
  newsletter: {
    title: 'Stay in the know',
    copy: 'Get updates about speakers, schedule, and early bird tickets.',
    ctaLabel: 'Sign up',
    onSubscribe: async (email: string) => {
      // Mock subscription - replace with actual API call
      console.log('Subscribing email:', email);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // In production, this would be:
      // await fetch('/api/newsletter', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email }),
      // });
    },
    privacyHref: '/privacy',
  },
  socials: [
    {
      kind: 'linkedin',
      href: 'https://www.linkedin.com/company/zurichjs',
      label: 'Follow ZurichJS on LinkedIn',
    },
    {
      kind: 'instagram',
      href: 'https://www.instagram.com/zurichjs',
      label: 'Follow ZurichJS on Instagram',
    },
  ],
} as const;

