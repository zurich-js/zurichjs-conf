import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useMotion } from '@/contexts/MotionContext';

export interface SpeakerCardProps {
  imageSrc?: string;
  name?: string;
  role?: string;
  index?: number;
  className?: string;
}

/**
 * Speaker card component
 * Shows speaker image (or silhouette placeholder) with optional name and role
 * Includes hover animations and stagger effects
 */
export const SpeakerCard: React.FC<SpeakerCardProps> = ({
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
      {/* Card Container */}
      <div className="relative bg-brand-primary rounded-lg overflow-hidden shadow-md w-[240px] h-[320px] transition-shadow duration-300 group-hover:shadow-xl">
        {/* Speaker Image or Silhouette */}
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={name || 'Speaker'}
            fill
            className="object-cover"
            sizes="240px"
          />
        ) : (
          <div className="w-full h-full flex items-end justify-center pb-4 bg-gradient-to-b from-brand-light to-brand-primary">
            {/* Silhouette SVG */}
            <svg
              viewBox="0 0 100 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-3/4 h-3/4 opacity-40"
              aria-hidden="true"
            >
              {/* Head */}
              <circle cx="50" cy="30" r="18" fill="currentColor" className="text-gray-700" />
              {/* Body */}
              <ellipse cx="50" cy="80" rx="30" ry="35" fill="currentColor" className="text-gray-700" />
            </svg>
          </div>
        )}

        {/* Name Badge (if provided) */}
        {name && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-3 text-white">
            <h3 className="font-semibold text-sm md:text-base">{name}</h3>
            {role && (
              <p className="text-xs md:text-sm text-white/80 mt-0.5">{role}</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

