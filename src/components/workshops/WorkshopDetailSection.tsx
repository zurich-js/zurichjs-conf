/**
 * WorkshopDetailSection
 * Full detail view for a single workshop, including abstract, outcomes,
 * prerequisites, agenda, and instructor bio.
 */

import React from 'react';
import { Clock, Users, MapPin, BookOpen, Target, ListChecks, GraduationCap } from 'lucide-react';
import { Heading, Tag, SocialIcon } from '@/components/atoms';
import type { PublicWorkshop } from '@/lib/types/workshop';
import { WORKSHOP_LEVEL_LABELS, WORKSHOP_TIME_SLOT_LABELS } from '@/lib/types/workshop';

export interface WorkshopDetailSectionProps {
  workshop: PublicWorkshop;
}

const levelTone = {
  beginner: 'success' as const,
  intermediate: 'accent' as const,
  advanced: 'warning' as const,
};

export const WorkshopDetailSection: React.FC<WorkshopDetailSectionProps> = ({ workshop }) => {
  const {
    title,
    long_abstract,
    level,
    topic_tags,
    duration_minutes,
    start_time,
    end_time,
    time_slot,
    outcomes,
    prerequisites,
    agenda,
    capacity,
    seats_remaining,
    is_sold_out,
    price,
    currency,
    location,
    room,
    instructor,
  } = workshop;

  const hours = Math.floor(duration_minutes / 60);
  const mins = duration_minutes % 60;
  const durationLabel = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const priceFormatted = (price / 100).toFixed(0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex flex-wrap gap-2 mb-4">
          <Tag label={WORKSHOP_LEVEL_LABELS[level]} tone={levelTone[level]} />
          <Tag label={WORKSHOP_TIME_SLOT_LABELS[time_slot]} tone="neutral" />
          {topic_tags.map(tag => (
            <Tag key={tag} label={tag} tone="neutral" />
          ))}
        </div>
        <Heading level="h1" className="text-3xl sm:text-4xl md:text-5xl">
          {title}
        </Heading>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 sm:p-6 bg-surface-card rounded-xl">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-brand-yellow-main flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-brand-gray-light">Duration</p>
            <p className="text-sm font-medium text-brand-white">{durationLabel}</p>
            <p className="text-xs text-brand-gray-light">{start_time} - {end_time}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-brand-yellow-main flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-brand-gray-light">Seats</p>
            <p className="text-sm font-medium text-brand-white">
              {is_sold_out ? 'Sold Out' : `${seats_remaining} left`}
            </p>
            <p className="text-xs text-brand-gray-light">{capacity} total</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-brand-yellow-main flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-brand-gray-light">Location</p>
            <p className="text-sm font-medium text-brand-white">{location}</p>
            {room && <p className="text-xs text-brand-gray-light">{room}</p>}
          </div>
        </div>
        <div className="flex items-start gap-3">
          <GraduationCap className="w-5 h-5 text-brand-yellow-main flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-brand-gray-light">Price</p>
            <p className="text-sm font-medium text-brand-white">{currency} {priceFormatted}</p>
            <p className="text-xs text-brand-gray-light">per person</p>
          </div>
        </div>
      </div>

      {/* Two-Column Layout: Content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* About */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-brand-yellow-main" />
              <Heading level="h2" className="text-xl">About This Workshop</Heading>
            </div>
            <div className="text-sm text-brand-gray-lightest leading-relaxed whitespace-pre-line">
              {long_abstract}
            </div>
          </section>

          {/* Outcomes */}
          {outcomes.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-brand-green" />
                <Heading level="h2" className="text-xl">What You Will Learn</Heading>
              </div>
              <ul className="space-y-2">
                {outcomes.map((outcome, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-brand-gray-lightest">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-green mt-1.5 flex-shrink-0" />
                    {outcome}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Agenda */}
          {agenda.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-5 h-5 text-brand-blue" />
                <Heading level="h2" className="text-xl">Agenda</Heading>
              </div>
              <ol className="space-y-2">
                {agenda.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-brand-gray-lightest">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-gray-dark text-xs font-semibold text-brand-gray-light flex-shrink-0">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Prerequisites */}
          {prerequisites.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-brand-orange" />
                <Heading level="h2" className="text-xl">Prerequisites</Heading>
              </div>
              <ul className="space-y-2">
                {prerequisites.map((prereq, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-brand-gray-lightest">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-orange mt-1.5 flex-shrink-0" />
                    {prereq}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar: Instructor */}
        {instructor && (
          <aside className="lg:col-span-1">
            <div className="bg-surface-card rounded-xl p-5 sm:p-6 sticky top-24">
              <Heading level="h3" className="text-lg mb-4">Instructor</Heading>
              <div className="flex flex-col items-center text-center">
                {instructor.avatar_url ? (
                  <img
                    src={instructor.avatar_url}
                    alt={instructor.name}
                    className="w-24 h-24 rounded-full object-cover mb-3"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-brand-gray-medium flex items-center justify-center text-2xl font-bold text-brand-white mb-3">
                    {instructor.name.charAt(0)}
                  </div>
                )}
                <p className="text-base font-bold text-brand-white">{instructor.name}</p>
                {instructor.job_title && (
                  <p className="text-sm text-brand-gray-light">{instructor.job_title}</p>
                )}
                {instructor.company && (
                  <p className="text-sm text-brand-gray-light">{instructor.company}</p>
                )}

                {/* Social Links */}
                <div className="flex items-center gap-1 mt-3">
                  {instructor.linkedin_url && (
                    <SocialIcon kind="linkedin" href={instructor.linkedin_url} label={`${instructor.name} on LinkedIn`} />
                  )}
                  {instructor.twitter_handle && (
                    <SocialIcon kind="x" href={`https://x.com/${instructor.twitter_handle}`} label={`${instructor.name} on X`} />
                  )}
                </div>

                {/* Bio */}
                {instructor.bio && (
                  <p className="text-sm text-brand-gray-lightest mt-4 text-left leading-relaxed">
                    {instructor.bio}
                  </p>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
