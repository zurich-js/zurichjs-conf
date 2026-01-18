import React from 'react';
import { Heading } from '@/components/atoms';
import { AboutHeroData } from '@/data/about-us';

export interface AboutHeroSectionProps {
  data: AboutHeroData;
}

export const AboutHeroSection: React.FC<AboutHeroSectionProps> = ({ data }) => {
  return (
    <div className="my-16">
      <Heading level="h1" variant="light" className="text-2xl lg:text-3xl font-bold">
        {data.title}
      </Heading>
    </div>
  );
};
