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
    <div className="bg-gray-100 rounded-lg p-6 w-full max-w-[440px] h-[250px] flex flex-col">
      <div className="mb-3 w-12 h-12 bg-gray-300 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-base text-gray-700 leading-relaxed flex-1 overflow-hidden">{description}</p>
    </div>
  );
};
