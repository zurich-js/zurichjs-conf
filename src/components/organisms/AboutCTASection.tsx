import React from 'react';
import Link from 'next/link';
import { Kicker, Heading } from '@/components/atoms';
import { Button } from '@/components/atoms/Button';
import { ParallelogramSection } from '@/components/organisms/ParallelogramSection';
import { AboutCTAData } from '@/data/about-us';

export interface AboutCTASectionProps {
  data: AboutCTAData;
}

export const AboutCTASection: React.FC<AboutCTASectionProps> = ({ data }) => {
  return (
    <ParallelogramSection
      backgroundColor="var(--color-brand-yellow-main)"
      className="mt-16"
    >
      <Kicker variant="light" className="mb-4">
        {data.kicker}
      </Kicker>
      <Heading level="h2" variant="light" className="mb-8 text-xl font-bold">
        {data.title}
      </Heading>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        <div className="space-y-6">
          <p className="text-gray-900 leading-relaxed text-base">
            {data.leftColumn}
          </p>
          <div>
            <Link href={data.buttonUrl}>
              <Button variant="dark" size="md">
                {data.buttonText}
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {data.rightColumn.map((text, index) => (
            <p key={index} className="text-gray-900 leading-relaxed text-base">
              {text}
            </p>
          ))}
        </div>
      </div>
    </ParallelogramSection>
  );
};
