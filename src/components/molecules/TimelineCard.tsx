import React, {forwardRef, useEffect, useState} from 'react';
import { motion } from 'framer-motion';
import { Tag, TagTone } from '@/components/atoms/Tag';
import { useMotion } from '@/contexts/MotionContext';
import {TimelineDot, TimelineIconType} from "@/components/molecules/TimelineDot";
import {clsx} from "clsx";

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
  showDate?: boolean;
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  tabIndex?: number;
  icon?: TimelineIconType;
}

export function isIsoInPast(iso: string, referenceTime = Date.now()): boolean {
    const ts = Date.parse(iso);
    if (Number.isNaN(ts)) return false; // invalid ISO -> treat as not past
    return ts < referenceTime;
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
      showDate = true,
      onClick,
      onKeyDown,
      tabIndex = 0,
      icon,
    },
    ref
  ) => {
    const { shouldAnimate } = useMotion();

      const [now, setNow] = useState<number | null>(null);

      // Call Date.now() in an effect (avoids impure call during render)
      useEffect(() => {
          setNow(Date.now());
      }, []);

      const inPast = now !== null ? isIsoInPast(dateISO, now) : false;

    const CardContent = () => (
      <div className={clsx('flex flex-col gap-3 w-full', {
            'opacity-50': inPast,
      })}>
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Date Column - Only show if showDate is true */}
          {showDate && (
            <time
              dateTime={dateISO}
              className="shrink-0 w-16 sm:w-20 pt-1 text-sm text-slate-400 font-medium"
            >
              {dateFormatted}
            </time>
          )}

          {/* Content Column */}
          <div className="flex-1 min-w-0 flex flex-col gap-2.5">
            <h3 className="text-base flex flex-wrap leading-none items-center gap-1.5 sm:text-lg font-semibold text-brand-white group-hover:text-brand-primary transition-colors">
              <TimelineDot
                icon={icon}
                isCurrent={isCurrent}
                emphasis={emphasis}
              />
              {title}
              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {tags.map((tag, index) => (
                    <Tag
                      key={`${tag.label}-${index}`}
                      label={tag.label}
                      tone={tag.tone}
                    />
                  ))}
                </div>
              )}
            </h3>

            {!inPast && body && (
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {body}
              </p>
            )}
          </div>
        </div>

      </div>
    );

    const cardElement = (
      <div
        ref={ref}
        className={`
          relative flex items-start gap-3 sm:gap-4
        bg-brand-gray-dark rounded-xl px-4 sm:px-5 py-3 sm:py-4
          transition-all duration-300
          ${href && !inPast ? 'cursor-pointer group hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(0,0,0,0.35)] focus-within:ring-2 focus-within:ring-[#F1E271] focus-within:ring-offset-2 focus-within:ring-offset-[#19191B]' : 'cursor-default'}
        `}
        role={href && !inPast  ? 'link' : 'group'}
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

