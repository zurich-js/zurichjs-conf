import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useMotion } from '@/contexts/MotionContext';

export interface HeroSpeakerCardProps {
  imageSrc?: string;
  name?: string;
  role?: string;
  index?: number;
  className?: string;
}

/**
 * Existing speaker card used by the homepage hero/grid area.
 */
export const HeroSpeakerCard: React.FC<HeroSpeakerCardProps> = ({
  imageSrc,
  name,
  role,
  index = 0,
  className = '',
}) => {
  const { shouldAnimate } = useMotion();

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        delay: 0.9 + index * 0.1,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
    hover: {
      y: -8,
      transition: {
        duration: 0.25,
        ease: 'easeOut' as const,
      },
    },
  };

  return (
    <motion.div
      className={`group relative ${className}`}
      initial={shouldAnimate ? 'hidden' : 'visible'}
      animate="visible"
      whileHover={shouldAnimate ? 'hover' : undefined}
      variants={shouldAnimate ? cardVariants : {}}
    >
      <div className="relative h-[320px] w-[240px] overflow-hidden rounded-lg bg-brand-primary shadow-md transition-shadow duration-300 group-hover:shadow-xl">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={name || 'Speaker'}
            fill
            className="object-cover"
            sizes="240px"
          />
        ) : (
          <div className="flex h-full w-full items-end justify-center bg-gradient-to-b from-brand-light to-brand-primary pb-4">
            <svg
              viewBox="0 0 100 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-3/4 w-3/4 opacity-40"
              aria-hidden="true"
            >
              <circle cx="50" cy="30" r="18" fill="currentColor" className="text-gray-700" />
              <ellipse cx="50" cy="80" rx="30" ry="35" fill="currentColor" className="text-gray-700" />
            </svg>
          </div>
        )}

        {name && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-3 text-brand-white backdrop-blur-sm">
            <h3 className="text-sm font-semibold md:text-base">{name}</h3>
            {role && <p className="mt-0.5 text-xs text-brand-white/80 md:text-sm">{role}</p>}
          </div>
        )}
      </div>
    </motion.div>
  );
};
