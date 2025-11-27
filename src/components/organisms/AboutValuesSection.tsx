import React from "react";
import { Kicker, Heading } from "@/components/atoms";
import { ValueCard } from "@/components/molecules/ValueCard";
import { AboutValuesData } from "@/data/about-us";

export interface AboutValuesSectionProps {
  data: AboutValuesData;
}

export const AboutValuesSection: React.FC<AboutValuesSectionProps> = ({
  data,
}) => {
  return (
    <div className="mb-16">
      <Kicker variant="light" className="mb-4">
        {data.kicker}
      </Kicker>
      <Heading level="h2" variant="light" className="mb-12 text-xl font-bold">
        {data.title}
      </Heading>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {data.values.map((value, index) => (
          <ValueCard
            key={index}
            icon={value.icon}
            title={value.title}
            description={value.description}
          />
        ))}
      </div>
    </div>
  );
};
