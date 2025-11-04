import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Tag, TagTone } from '@/components/atoms/Tag';
import { useMotion } from '@/contexts/MotionContext';

export interface TimelineTag {
  label: string;
  tone?: TagTone;
}

export interface TimelineCardProps {
  title: string;
  dateISO: string;
  dateFormatted: string;
  body?: string;
  tags?: TimelineTag[];
  href?: string;
  emphasis?: boolean;
  isCurrent?: boolean;
  delay?: number;
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  tabIndex?: number;
}

/**
 * TimelineCard component displaying a timeline event
 * Supports clickable cards with links, tags, and emphasis states
 */
export const TimelineCard = forwardRef<HTMLDivElement, TimelineCardProps>(
  (
    {
      title,
      dateISO,
      dateFormatted,
      body,
      tags,
      href,
      emphasis = false,
      isCurrent = false,
      delay = 0,
      onClick,
      onKeyDown,
      tabIndex = 0,
    },
    ref
  ) => {
    const { shouldAnimate } = useMotion();

    const cardClasses = `
      group relative flex items-start gap-3 sm:gap-4
      bg-[#242528] rounded-2xl px-4 sm:px-5 py-3 sm:py-4
      shadow-[0_10px_25px_rgba(0,0,0,0.25)]
      ${emphasis || isCurrent ? 'ring-1 ring-[#F1E271]/20 bg-[#242528]/90' : ''}
      transition-all duration-300
      ${href ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.35)] focus-within:ring-2 focus-within:ring-[#F1E271] focus-within:ring-offset-2 focus-within:ring-offset-[#19191B]' : ''}
    `;

    const CardContent = () => (
      <>
        {/* Date Column */}
        <time
          dateTime={dateISO}
          className="flex-shrink-0 w-16 sm:w-20 pt-1 text-sm text-slate-400 font-medium"
        >
          {dateFormatted}
        </time>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-1 group-hover:text-[#F1E271] transition-colors">
            {title}
          </h3>

          {body && (
            <p className="text-sm text-slate-300 leading-relaxed mb-2">
              {body}
            </p>
          )}

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((tag, index) => (
                <Tag
                  key={`${tag.label}-${index}`}
                  label={tag.label}
                  tone={tag.tone}
                />
              ))}
            </div>
          )}
        </div>
      </>
    );

    const cardElement = (
      <div
        ref={ref}
        className={cardClasses}
        role={href ? 'link' : 'group'}
        aria-current={isCurrent ? 'true' : undefined}
        tabIndex={tabIndex}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        {href ? (
          <a
            href={href}
            className="absolute inset-0 z-10 rounded-2xl focus:outline-none"
            aria-label={title}
            tabIndex={-1}
          >
            <span className="sr-only">{title}</span>
          </a>
        ) : null}
        <CardContent />
      </div>
    );

    if (shouldAnimate) {
      return (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.5,
            delay,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {cardElement}
        </motion.div>
      );
    }

    return cardElement;
  }
);

TimelineCard.displayName = 'TimelineCard';

