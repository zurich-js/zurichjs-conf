import React from 'react';
import { motion } from 'framer-motion';
import { useMotion } from '@/contexts/MotionContext';
import { LinkGroup, NavLink } from '@/components/molecules/LinkGroup';
import { NewsletterForm } from '@/components/molecules/NewsletterForm';
import { SocialIcon, SocialIconType } from '@/components/atoms/SocialIcon';

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
  const { shouldAnimate } = useMotion();

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
        {shouldAnimate ? (
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12"
          >
            {/* About Column */}
            <motion.div variants={item} className="space-y-4 lg:col-span-1">
              <h3 className="text-white font-semibold text-[2rem] leading-tight">{about.title}</h3>
              <p className="text-[#A8B1BD] text-sm leading-relaxed">
                {about.copy}
              </p>
              {about.orgNote && (
                <p className="text-[#7C7E80] text-xs leading-relaxed">{about.orgNote}</p>
              )}
              {about.moreHref && (
                <a
                  href={about.moreHref}
                  className="text-blue-primary hover:text-blue-dark text-sm font-medium inline-flex items-center gap-1 hover:underline decoration-1 underline-offset-4 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[rgba(241,226,113,0.5)] rounded-sm"
                >
                  More about us
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 2L8 6L4 10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              )}
            </motion.div>

            {/* Conference Links Column */}
            <motion.div variants={item}>
              <LinkGroup title={conference.title} links={conference.links} />
            </motion.div>

            {/* Legal Links Column */}
            <motion.div variants={item}>
              <LinkGroup title={legal.title} links={legal.links} />
            </motion.div>

            {/* Newsletter & Socials Column */}
            <motion.div variants={item} className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-white font-semibold text-lg">{newsletter.title}</h3>
                {newsletter.copy && (
                  <p className="text-[#A8B1BD] text-sm">{newsletter.copy}</p>
                )}
              </div>

              <NewsletterForm
                ctaLabel={newsletter.ctaLabel}
                onSubscribe={newsletter.onSubscribe}
                privacyHref={newsletter.privacyHref}
              />

              {socials.length > 0 && (
                <div className="pt-4">
                  <p className="text-[#A8B1BD] text-sm mb-3">Follow us</p>
                  <div className="flex gap-2">
                    {socials.map((social, index) => (
                      <SocialIcon
                        key={index}
                        kind={social.kind}
                        href={social.href}
                        label={social.label}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
            {/* About Column */}
            <div className="space-y-4 lg:col-span-1">
              <h3 className="text-white font-semibold text-[2rem] leading-tight">{about.title}</h3>
              <p className="text-[#A8B1BD] text-sm leading-relaxed">
                {about.copy}
              </p>
              {about.orgNote && (
                <p className="text-[#7C7E80] text-xs leading-relaxed">{about.orgNote}</p>
              )}
              {about.moreHref && (
                <a
                  href={about.moreHref}
                  className="text-blue-primary hover:text-blue-dark text-sm font-medium inline-flex items-center gap-1 hover:underline decoration-1 underline-offset-4 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[rgba(241,226,113,0.5)] rounded-sm"
                >
                  More about us
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 2L8 6L4 10"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              )}
            </div>

            {/* Conference Links Column */}
            <div>
              <LinkGroup title={conference.title} links={conference.links} />
            </div>

            {/* Legal Links Column */}
            <div>
              <LinkGroup title={legal.title} links={legal.links} />
            </div>

            {/* Newsletter & Socials Column */}
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-white font-semibold text-lg">{newsletter.title}</h3>
                {newsletter.copy && (
                  <p className="text-[#A8B1BD] text-sm">{newsletter.copy}</p>
                )}
              </div>

              <NewsletterForm
                ctaLabel={newsletter.ctaLabel}
                onSubscribe={newsletter.onSubscribe}
                privacyHref={newsletter.privacyHref}
              />

              {socials.length > 0 && (
                <div className="pt-4">
                  <p className="text-[#A8B1BD] text-sm mb-3">Follow us</p>
                  <div className="flex gap-2">
                    {socials.map((social, index) => (
                      <SocialIcon
                        key={index}
                        kind={social.kind}
                        href={social.href}
                        label={social.label}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom stripe with copyright */}
        {about.orgNote && (
          <div className="mt-12 pt-8">
            <p className="text-text-disabled text-xs text-center mt-8">
              {about.orgNote}
            </p>
          </div>
        )}
      </footer>
  );
};

