import React from 'react';
import { SpeakerCard, SpeakerCardProps } from './SpeakerCard';

export interface SpeakerGridProps {
  speakers: SpeakerCardProps[];
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

/**
 * Composable speaker grid component
 * Desktop: Shows 4 cards in a grid
 * Mobile/Tablet: Horizontally scrollable cards
 */
export const SpeakerGrid: React.FC<SpeakerGridProps> = ({
  speakers,
  maxWidth = '7xl',
  className = '',
}) => {
  return (
    <div className={`w-full ${className}`}>
      <div className={`${maxWidthStyles[maxWidth]} mx-auto px-6 lg:px-8`}>
        <div className="flex lg:grid lg:grid-cols-4 gap-3 pb-4 lg:pb-0 overflow-x-auto lg:overflow-visible overflow-y-hidden scrollbar-hide">
          {speakers.map((speaker, index) => (
            <div key={speaker.name || `speaker-${index}`} className="shrink-0 lg:shrink">
              <SpeakerCard
                {...speaker}
                index={index}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

