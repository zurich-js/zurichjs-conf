import React from "react";

export interface TeamMemberCardProps {
  imageSrc?: string;
  imageAlt: string;
  name: string;
  role: string;
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  name,
  role,
}) => {
  return (
    <div>
      <div
        className="mb-4 bg-gray-200 rounded-lg flex items-center justify-center"
        style={{ width: "290px", height: "210px" }}
      >
        {/* Placeholder div - replace with actual image later */}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{name}</h3>
      <p className="text-base text-gray-600">{role}</p>
    </div>
  );
};
