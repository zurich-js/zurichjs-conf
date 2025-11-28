import React from "react";
import { Kicker, Heading } from "@/components/atoms";
import { TeamMemberCard } from "@/components/molecules/TeamMemberCard";
import { AboutTeamData } from "@/data/about-us";

export interface AboutTeamSectionProps {
  data: AboutTeamData;
}

export const AboutTeamSection: React.FC<AboutTeamSectionProps> = ({ data }) => {
  return (
    <div className="mb-16">
      <Kicker variant="light" className="mb-4">
        {data.kicker}
      </Kicker>
      <Heading level="h2" variant="light" className="mb-6 text-xl font-bold">
        {data.title}
      </Heading>
      <p
        className="text-base text-gray-700 leading-relaxed mb-12 max-w-3xl"
        dangerouslySetInnerHTML={{ __html: data.description }}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {data.members.map((member, index) => (
          <TeamMemberCard
            key={index}
            imageSrc={member.imageSrc}
            imageAlt={member.imageAlt}
            name={member.name}
            role={member.role}
          />
        ))}
      </div>
      <div className="mt-16">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {data.volunteersTitle}
        </h3>
        <p
          className="text-base text-gray-700 leading-relaxed mb-8 max-w-3xl"
          dangerouslySetInnerHTML={{ __html: data.volunteersDescription }}
        />
        <div className="flex flex-wrap gap-4">
          {data.volunteers.map((name, index) => (
            <div key={index} className=" bg-brand-gray-lightest rounded-lg p-2 px-4 text-brand-gray-darkest leading-relaxed flex items-center">
              <p className="font-medium">{name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
