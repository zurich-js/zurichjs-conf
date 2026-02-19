/**
 * WorkshopCard
 * Displays a workshop card with title, instructor, level, duration, tags, price, and seats.
 * Used on the /workshops page in the schedule grid.
 */

import React from 'react';
import Link from 'next/link';
import { Clock, Users, MapPin, ArrowRight } from 'lucide-react';
import { Tag } from '@/components/atoms';
import type { PublicWorkshop } from '@/lib/types/workshop';
import { WORKSHOP_LEVEL_LABELS } from '@/lib/types/workshop';

export interface WorkshopCardProps {
  workshop: PublicWorkshop;
}

const levelTone = {
  beginner: 'success' as const,
  intermediate: 'accent' as const,
  advanced: 'warning' as const,
};

export const WorkshopCard: React.FC<WorkshopCardProps> = ({ workshop }) => {
  const {
    slug,
    title,
    short_abstract,
    level,
    topic_tags,
    duration_minutes,
    start_time,
    end_time,
    price,
    currency,
    capacity,
    seats_remaining,
    is_sold_out,
    instructor,
    location,
  } = workshop;

  const priceFormatted = (price / 100).toFixed(0);
  const hours = Math.floor(duration_minutes / 60);
  const mins = duration_minutes % 60;
  const durationLabel = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;

  return (
    <Link
      href={`/workshops/${slug}`}
      className="group flex flex-col bg-surface-card hover:bg-surface-card-hover rounded-2xl p-5 sm:p-6 transition-all duration-300 ease-in-out border border-transparent hover:border-brand-gray-medium/30"
    >
      {/* Tags Row */}
      <div className="flex flex-wrap gap-2 mb-3">
        <Tag label={WORKSHOP_LEVEL_LABELS[level]} tone={levelTone[level]} />
        {topic_tags.slice(0, 3).map(tag => (
          <Tag key={tag} label={tag} tone="neutral" />
        ))}
      </div>

      {/* Title */}
      <h3 className="text-lg sm:text-xl font-bold text-brand-white mb-2 group-hover:text-brand-yellow-main transition-colors duration-300">
        {title}
      </h3>

      {/* Abstract */}
      <p className="text-sm text-brand-gray-lightest mb-4 line-clamp-2 flex-grow">
        {short_abstract}
      </p>

      {/* Instructor */}
      {instructor && (
        <div className="flex items-center gap-3 mb-4">
          {instructor.avatar_url ? (
            <img
              src={instructor.avatar_url}
              alt={instructor.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-gray-medium flex items-center justify-center text-xs font-bold text-brand-white">
              {instructor.name.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-brand-white">{instructor.name}</p>
            {instructor.company && (
              <p className="text-xs text-brand-gray-light">{instructor.company}</p>
            )}
          </div>
        </div>
      )}

      {/* Meta Row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-brand-gray-light mb-4">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {start_time} - {end_time} ({durationLabel})
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {location}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {is_sold_out ? 'Sold out' : `${seats_remaining} / ${capacity} seats`}
        </span>
      </div>

      {/* Footer: Price + CTA */}
      <div className="flex items-center justify-between pt-4 border-t border-brand-gray-medium/30">
        <div>
          <span className="text-xs text-brand-gray-light">{currency}</span>
          <span className="text-xl font-bold text-brand-white ml-1">{priceFormatted}</span>
          <span className="text-xs text-brand-gray-light ml-1">/ person</span>
        </div>
        {is_sold_out ? (
          <span className="text-sm font-semibold text-brand-orange">Sold Out</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-yellow-main group-hover:gap-2 transition-all duration-300">
            View Details
            <ArrowRight className="w-4 h-4" />
          </span>
        )}
      </div>
    </Link>
  );
};
