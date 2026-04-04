import React from 'react';
import { motion } from 'framer-motion';
import { LinkGroup, NewsletterForm } from '@/components/molecules';
import { Logo, Button, SocialIcon } from '@/components/atoms';
import { SectionSplitView } from '@/components/organisms';
import { subscribeToNewsletter } from '@/lib/api/newsletter';

export interface SiteFooterProps {
  showContactLinks?: boolean;
}

const about = {
  title: 'Who are we?',
  copy: 'Our mission is to be the #1 JavaScript resource for developers in the Zurich tech scene, offering everything from meetups and workshops, to creating unparalleled networking opportunities, while making sure everybody feels welcome and included.',
  orgNote: 'Zurich JS Conf is part of the Swiss JavaScript Group, a non-profit association registered in Switzerland.',
  moreHref: '/about',
};

const conferenceLinks = {
  title: 'Conference',
  links: [
    { label: 'Call for Papers', href: '/cfp' },
    { label: 'Speakers', href: '/#speakers', locked: true },
    { label: 'Schedule', href: '/#schedule' },
    { label: 'Venue', href: '/about#venue' },
    { label: 'Workshops', href: '/#schedule', locked: true },
    { label: 'Sponsor us', href: '/sponsorship' },
    { label: 'F.A.Q.', href: '/faq' },
    { label: 'Trip Cost Calculator', href: '/trip-cost' },
    { label: 'Convince Your Boss', href: '/convince-your-boss' },
    { label: 'Blog', href: '/blog' },
  ],
} as const;

const legalLinks = {
  title: 'Legal',
  links: [
    { label: 'Terms of Service', href: '/info/terms-of-service' },
    { label: 'Privacy Policy', href: '/info/privacy-policy' },
    { label: 'Refund Policy', href: '/info/refund-policy' },
    { label: 'Code of Conduct', href: '/info/code-of-conduct' },
  ],
} as const;

const newsletterConfig = {
  title: 'Stay in the know',
  copy: 'Get updates about speakers, schedule, and early bird tickets.',
  ctaLabel: 'Sign up',
  onSubscribe: async (email: string) => {
    await subscribeToNewsletter({ email, source: 'footer' });
  },
  privacyHref: '/info/privacy-policy',
};

const socials = [
  { kind: 'linkedin' as const, href: 'https://www.linkedin.com/company/zurichjs', label: 'Follow ZurichJS on LinkedIn' },
  { kind: 'bluesky' as const, href: 'https://bsky.app/profile/zurichjs.com', label: 'Follow ZurichJS on Bluesky' },
  { kind: 'x' as const, href: 'https://www.x.com/zurichjs', label: 'Follow ZurichJS on X' },
  { kind: 'instagram' as const, href: 'https://www.instagram.com/zurich.js', label: 'Follow ZurichJS on Instagram' },
];

/**
 * SiteFooter organism component
 * Production-grade footer with four columns: About, Conference, Legal, Newsletter
 * Includes diagonal separator, responsive layout, and full accessibility support
 */
export const SiteFooter: React.FC<SiteFooterProps> = ({
  showContactLinks = false,
}) => {

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <footer className="relative print:hidden" role="contentinfo">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="space-y-16"
        >
          {showContactLinks && (
              <SectionSplitView
                  kicker="Get in touch"
                  title="Questions, feedback, requests?"
                  variant="dark"
                  subtitle={
                      <>
                          <span className="block">We&apos;d love to hear from you. Whether you have questions about the conference,
                  want to become a sponsor, or are interested in speaking, our team is here to help.</span>
                      </>
                  }
              >
                  <motion.div
                      variants={container}
                      className="grid grid-cols-1 grid-rows-3 gap-5 pt-8 lg:gap-8 lg:grid-rows-none lg:grid-cols-[2fr_2fr_3fr] h-full"
                  >
                      <motion.div variants={item} className="flex flex-col justify-between gap-2.5 self-start h-full">
                          <h3 className="text-brand-white font-semibold text-lg w-max">Ask us anything</h3>
                          <p className="text-sm text-brand-gray-medium">If you have any uncertainties or burning questions, don’t hesitate to reach out.</p>
                          <Button variant="outline" size="sm" className="w-fit mt-auto" href="mailto:hello@zurichjs.com">Send inquiry</Button>
                      </motion.div>
                      <motion.div variants={item} className="flex flex-col justify-between gap-2.5 self-start h-full">
                          <h3 className="text-brand-white font-semibold text-lg w-max">Give us your feedback</h3>
                          <p className="text-sm text-brand-gray-medium">We want to make this a great experience for everyone. If you have feedback, let us know!</p>
                          <Button variant="outline" size="sm" className="w-fit mt-auto" href="mailto:hello@zurichjs.com">Send feedback</Button>
                      </motion.div>
                      <motion.div variants={item} className="flex flex-col justify-between gap-2.5 xl:max-w-xs 2xl:max-w-[unset] self-start h-full">
                          <h3 className="text-brand-white font-semibold text-lg">Found a bug?</h3>
                          <p className="text-sm text-brand-gray-medium">FIll out the form, and we’ll get right to it as soon as we can.</p>
                          <Button variant="outline" size="sm" className="w-fit mt-auto" href="/report-issue" asChild>Report an issue</Button>
                      </motion.div>
                  </motion.div>
              </SectionSplitView>
          )}

          <SectionSplitView
            kicker="About us"
            title={about.title}
            variant="dark"
            subtitle={
              <>
                <span className="block">{about.copy}</span>
                {about.orgNote && <span className="mt-6 block text-sm">{about.orgNote}</span>}
              </>
            }
            link={about.moreHref ? { label: 'More about us', href: about.moreHref } : undefined}
          >
          <motion.div
            variants={container}
            className="grid grid-cols-1 grid-rows-3 gap-5 pt-8 lg:gap-8 lg:grid-rows-none lg:grid-cols-[2fr_2fr_3fr]"
          >
            <motion.div variants={item} >
              <LinkGroup title={conferenceLinks.title} links={[...conferenceLinks.links]} />
            </motion.div>

            <motion.div variants={item}>
              <LinkGroup title={legalLinks.title} links={[...legalLinks.links]} />
            </motion.div>

            <motion.div variants={item} className="flex flex-col justify-between gap-2.5 xl:max-w-xs 2xl:max-w-[unset] self-start">
              <h3 className="text-brand-white font-semibold text-lg">{newsletterConfig.title}</h3>
              <p className="text-brand-gray-light text-sm">{newsletterConfig.copy}</p>

              <NewsletterForm
                ctaLabel={newsletterConfig.ctaLabel}
                onSubscribe={newsletterConfig.onSubscribe}
                privacyHref={newsletterConfig.privacyHref}
              />
            </motion.div>
          </motion.div>
          </SectionSplitView>

          <motion.div
            variants={item}
            className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
          >
            <div className="flex flex-col gap-3">
              <Logo width={120} height={32} />
            </div>

            <div className="flex gap-2 md:justify-end">
              {socials.map((social) => (
                <SocialIcon
                  key={social.kind}
                  kind={social.kind}
                  href={social.href}
                  label={social.label}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>

      <p className="text-xs text-brand-gray-light md:text-center absolute -bottom-20 translate-y-full inset-x-0">
        © 2026 Swiss JavaScript Group (CHE-255.581.547). All rights reserved
      </p>
    </footer>
  );
};
