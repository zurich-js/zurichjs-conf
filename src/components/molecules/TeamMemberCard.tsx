import React from "react";
import Image from "next/image";

export interface TeamMemberCardProps {
  imageSrc: string;
  imageAlt: string;
  name: string;
  role: string;
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  imageSrc,
  imageAlt,
  name,
  role,
}) => {
  return (
    <div>
      <div
        className="mb-4 bg-gray-200 rounded-lg overflow-hidden"
        style={{ width: "290px", height: "210px" }}
      >
        <Image
          src={imageSrc}
          alt={imageAlt}
          width={290}
          height={210}
          className="w-full h-full object-cover"
        />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{name}</h3>
      <p className="text-base text-gray-600">{role}</p>
    </div>
  );
};
