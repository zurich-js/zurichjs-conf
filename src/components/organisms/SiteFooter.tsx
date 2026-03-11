import React from 'react';
import { motion } from 'framer-motion';
import { LinkGroup, NavLink, NewsletterForm } from '@/components/molecules';
import { Logo, Button, SocialIcon, SocialIconType } from '@/components/atoms';
import { SectionContainer, SectionSplitView } from '@/components/organisms';

export interface SiteFooterProps {
  showContactLinks?: boolean;
  about: {
    title: string;
    copy: string;
    orgNote?: string;
    moreHref?: string;
  };
  conference: {
    title: string;
    links: NavLink[];
  };
  legal: {
    title: string;
    links: NavLink[];
  };
  newsletter: {
    title: string;
    copy?: string;
    ctaLabel?: string;
    onSubscribe?: (email: string) => Promise<void> | void;
    privacyHref?: string;
  };
  socials?: {
    kind: SocialIconType;
    href: string;
    label?: string;
  }[];
}

/**
 * SiteFooter organism component
 * Production-grade footer with four columns: About, Conference, Legal, Newsletter
 * Includes diagonal separator, responsive layout, and full accessibility support
 */
export const SiteFooter: React.FC<SiteFooterProps> = ({
  showContactLinks = false,
  about,
  conference,
  legal,
  newsletter,
  socials = [],
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
      <SectionContainer>
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
                          <Button variant="outline" size="sm" className="w-fit mt-auto" href="mailto:">Send inquiry</Button>
                      </motion.div>
                      <motion.div variants={item} className="flex flex-col justify-between gap-2.5 self-start h-full">
                          <h3 className="text-brand-white font-semibold text-lg w-max">Give us your feedback</h3>
                          <p className="text-sm text-brand-gray-medium">We want to make this a great experience for everyone. If you have feedback, let us know!</p>
                          <Button variant="outline" size="sm" className="w-fit mt-auto" href="mailto:">Send feedback</Button>
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
              <LinkGroup title={conference.title} links={conference.links} />
            </motion.div>

            <motion.div variants={item}>
              <LinkGroup title={legal.title} links={legal.links} />
            </motion.div>

            <motion.div variants={item} className="flex flex-col justify-between gap-2.5 xl:max-w-xs 2xl:max-w-[unset] self-start">
              <h3 className="text-brand-white font-semibold text-lg">{newsletter.title}</h3>
              {newsletter.copy && (
                <p className="text-brand-gray-light text-sm">{newsletter.copy}</p>
              )}

              <NewsletterForm
                ctaLabel={newsletter.ctaLabel}
                onSubscribe={newsletter.onSubscribe}
                privacyHref={newsletter.privacyHref}
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

            {socials.length > 0 && (
              <div className="flex gap-2 md:justify-end">
                {socials.map((social, index) => (
                  <SocialIcon
                    key={index}
                    kind={social.kind}
                    href={social.href}
                    label={social.label}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </SectionContainer>

      <p className="text-xs text-brand-gray-light md:text-center absolute -bottom-20 translate-y-full inset-x-0">
        © 2026 Swiss JavaScript Group (CHE-255.581.547). All rights reserved
      </p>
    </footer>
  );
};
