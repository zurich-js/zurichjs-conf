import React from "react";
import { Kicker, Heading } from "@/components/atoms";
import { Button } from "@/components/atoms/Button";
import { ParallelogramSection } from "@/components/organisms/ParallelogramSection";
import { AboutVenueData } from "@/data/about-us";

export interface AboutVenueSectionProps {
  data: AboutVenueData;
}

export const AboutVenueSection: React.FC<AboutVenueSectionProps> = ({
  data,
}) => {
  return (
    <ParallelogramSection backgroundColor="var(--color-brand-gray-darkest)" className="my-16">
      <div className="rich-text-renderer" id={"venue"}>
        <Kicker variant="dark" className="mb-4">
          {data.kicker}
        </Kicker>
        <Heading level="h2" variant="dark" className="mb-8 text-xl font-bold">
          {data.title}
        </Heading>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
          <div className="space-y-4">
            {data.description.map((text, index) => (
              <p
                key={index}
                className="text-white leading-relaxed text-base"
                dangerouslySetInnerHTML={{ __html: text }}
              />
            ))}
          </div>
          <div>
            <div className="mb-6 w-full h-64 bg-gray-200 rounded-lg overflow-hidden">
              <iframe
                src={data.mapUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`${data.title} location`}
              />
            </div>
            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                asChild
                href={data.directionsUrl}
              >
                Get Directions
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                asChild
                href={data.websiteUrl}
              >
                Visit Website
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ParallelogramSection>
  );
};
