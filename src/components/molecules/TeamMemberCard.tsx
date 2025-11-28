import React from "react";
import Image from 'next/image';

export interface TeamMemberCardProps {
  imageSrc?: string;
  imageAlt: string;
  name: string;
  role: string;
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  name,
  role,
  imageSrc,
  imageAlt,
}) => {
  return (
    <div>
      <div
        className="mb-4 bg-gradient-to-tr from-brand-primary to-brand-dark rounded-lg aspect-square"
      >
        <Image
          src={imageSrc || '/images/placeholder-profile.png'}
          alt={imageAlt}
          width={600}
          height={600}
          className="object-cover size-full rounded-lg"
        />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{name}</h3>
      <p className="text-xs text-gray-600">{role}</p>
    </div>
  );
};
