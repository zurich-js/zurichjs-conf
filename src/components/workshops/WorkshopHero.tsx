/**
 * WorkshopHero
 * Hero section for the Zurich Engineering Day (workshops page)
 * Matches the design system with ShapedSection-compatible styling.
 */

import React from 'react';
import { Calendar, MapPin, Wrench } from 'lucide-react';
import { Heading, Kicker, Button } from '@/components/atoms';

export interface WorkshopHeroProps {
  onBrowseClick?: () => void;
}

export const WorkshopHero: React.FC<WorkshopHeroProps> = ({ onBrowseClick }) => {
  return (
    <div className="text-center max-w-3xl mx-auto">
      <Kicker animate delay={0}>Zurich Engineering Day</Kicker>

      <Heading level="h1" className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mt-4" animate delay={0.1}>
        Hands-on Workshops
      </Heading>

      <p className="text-base sm:text-lg text-brand-gray-lightest mt-4 sm:mt-6 max-w-2xl mx-auto">
        Level up your skills in a full day of immersive, hands-on workshops led by industry experts.
        From React and TypeScript to Node.js and beyond — choose your morning and afternoon sessions.
      </p>

      {/* Date & Location */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mt-6 sm:mt-8 text-sm text-brand-gray-light">
        <span className="inline-flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-yellow-main" />
          September 10, 2026
        </span>
        <span className="inline-flex items-center gap-2">
          <MapPin className="w-4 h-4 text-brand-yellow-main" />
          Zurich, Switzerland
        </span>
        <span className="inline-flex items-center gap-2">
          <Wrench className="w-4 h-4 text-brand-yellow-main" />
          Morning + Afternoon sessions
        </span>
      </div>

      {/* CTA */}
      <div className="mt-8">
        <Button variant="primary" size="lg" onClick={onBrowseClick}>
          Browse Workshops
        </Button>
      </div>
    </div>
  );
};
