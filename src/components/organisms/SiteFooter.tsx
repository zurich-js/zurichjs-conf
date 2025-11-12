import React from 'react';
import { motion } from 'framer-motion';
import { LinkGroup, NavLink } from '@/components/molecules/LinkGroup';
import { NewsletterForm } from '@/components/molecules/NewsletterForm';
import { SocialIcon, SocialIconType } from '@/components/atoms/SocialIcon';
import {SectionSplitView} from "@/components/organisms/SectionSplitView";

export interface SiteFooterProps {
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
      <footer className="relative" role="contentinfo">
        <SectionSplitView
          kicker="About us"
          title={about.title}
          variant="dark"
          subtitle={
            <>
              <span>{about.copy}</span>
              <span>{about.orgNote}</span>
            </>
          }
          link={about.moreHref ? { label: 'More about us', href: about.moreHref } : undefined}
        >
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-100px' }}
            className="flex flex-col lg:flex-row pt-8 gap-5 lg:gap-8 w-full justify-between"
          >
            {/* Conference Links Column */}
            <motion.div variants={item} >
              <LinkGroup title={conference.title} links={conference.links} />
            </motion.div>

            {/* Legal Links Column */}
            <motion.div variants={item}>
              <LinkGroup title={legal.title} links={legal.links} />
            </motion.div>

            {/* Newsletter & Socials Column */}
            <motion.div variants={item} className="flex flex-col justify-between gap-2.5 xl:max-w-xs 2xl:max-w-[unset]">
              <h3 className="text-brand-white font-semibold text-lg">{newsletter.title}</h3>
              {newsletter.copy && (
                <p className="text-brand-gray-light text-sm">{newsletter.copy}</p>
              )}

              <NewsletterForm
                ctaLabel={newsletter.ctaLabel}
                onSubscribe={newsletter.onSubscribe}
                privacyHref={newsletter.privacyHref}
              />

              {socials.length > 0 && (
                <div className="mt-auto flex gap-2 pt-4 lg:pt-0 lg:self-end">
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
        </SectionSplitView>
      </footer>
  );
};

