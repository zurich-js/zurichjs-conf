import React from 'react';
import { ParallelogramSection } from '@/components/organisms/ParallelogramSection';
import { StatCard } from '@/components/molecules/StatCard';
import { AboutStatData } from '@/data/about-us';

export interface AboutStatsSectionProps {
  data: AboutStatData[];
}

export const AboutStatsSection: React.FC<AboutStatsSectionProps> = ({
  data,
}) => {
  return (
    <ParallelogramSection backgroundColor="#f3f4f6" className="my-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
        {data.map((stat, index) => (
          <StatCard key={index} value={stat.value} label={stat.label} />
        ))}
      </div>
    </ParallelogramSection>
  );
};
