import React, { ReactNode } from "react";

export interface ValueCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export const ValueCard: React.FC<ValueCardProps> = ({
  icon,
  title,
  description,
}) => {
  return (
    <div className="bg-gray-100 rounded-lg p-8">
      <div className="mb-4 w-12 h-12 bg-gray-300 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-700 leading-relaxed text-base">{description}</p>
    </div>
  );
};
