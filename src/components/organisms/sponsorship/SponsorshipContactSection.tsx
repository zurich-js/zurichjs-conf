import React from 'react';
import { motion } from 'framer-motion';
import { Heading, Kicker, Button } from '@/components/atoms';
import type { SponsorshipContactData } from '@/data/sponsorship';

export interface SponsorshipContactSectionProps {
  data: SponsorshipContactData;
}

/**
 * SponsorshipContactSection - Contact information section
 *
 * Displays contact information for sponsorship inquiries with
 * email links and a CTA button.
 */
export const SponsorshipContactSection: React.FC<SponsorshipContactSectionProps> = ({
  data,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
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
    <motion.div
      className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12"
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-100px' }}
    >
      {/* Left column - Header and contacts */}
      <div className="flex flex-col gap-3">
        <motion.div variants={itemVariants}>
          <Kicker variant="dark">{data.kicker}</Kicker>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Heading
            level="h2"
            variant="dark"
            className="text-xl md:text-2xl font-bold"
          >
            {data.title}
          </Heading>
        </motion.div>

        <motion.div
          className="flex flex-col gap-3 mt-2"
          variants={itemVariants}
        >
          {data.contacts.map((contact) => (
            <div key={contact.title} className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-brand-white">
                {contact.title}
              </span>
              <a
                href={`mailto:${contact.email}`}
                className="text-sm text-brand-gray-light hover:text-brand-white transition-colors"
              >
                {contact.email}
              </a>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right column - Description and CTA */}
      <div className="flex flex-col gap-4 justify-center">
        <motion.p
          className="text-sm text-brand-gray-light leading-relaxed"
          variants={itemVariants}
        >
          {data.description}
        </motion.p>

        <motion.div variants={itemVariants}>
          <Button
            variant="outline"
            size="sm"
            href={data.ctaHref}
            asChild
          >
            {data.ctaLabel}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};
