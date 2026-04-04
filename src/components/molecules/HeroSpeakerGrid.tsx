import React from 'react';
import { HeroSpeakerCard, HeroSpeakerCardProps } from './HeroSpeakerCard';

export interface HeroSpeakerGridProps {
  speakers: HeroSpeakerCardProps[];
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  className?: string;
}

const maxWidthStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export const HeroSpeakerGrid: React.FC<HeroSpeakerGridProps> = ({
  speakers,
  maxWidth = '7xl',
  className = '',
}) => {
  return (
    <div className={`w-full ${className}`}>
      <div className={`${maxWidthStyles[maxWidth]} mx-auto px-6 lg:px-8`}>
        <div className="scrollbar-hide flex gap-3 overflow-x-auto overflow-y-hidden pb-4 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
          {speakers.map((speaker, index) => (
            <div key={speaker.name || `speaker-${index}`} className="shrink-0 lg:shrink">
              <HeroSpeakerCard {...speaker} index={index} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
