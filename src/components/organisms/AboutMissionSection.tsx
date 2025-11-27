import React from 'react';
import { Kicker, Heading } from '@/components/atoms';
import { AboutMissionData } from '@/data/about-us';

export interface AboutMissionSectionProps {
  data: AboutMissionData;
}

export const AboutMissionSection: React.FC<AboutMissionSectionProps> = ({
  data,
}) => {
  return (
    <div className="mb-16">
      <Kicker variant="light" className="mb-4">
        {data.kicker}
      </Kicker>
      <Heading level="h2" variant="light" className="mb-8 text-xl font-bold">
        {data.title}
      </Heading>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        <div className="space-y-4">
          {data.leftColumn.map((text, index) => (
            <p key={index} className="text-gray-700 leading-relaxed text-base">
              {text}
            </p>
          ))}
        </div>
        <div className="space-y-4">
          {data.rightColumn.map((text, index) => (
            <p key={index} className="text-gray-700 leading-relaxed text-base">
              {text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};
