import React, { ReactNode } from "react";
import { ValueIcon } from "@/components/atoms/ValueIcon";

export interface ValueCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export const ValueCard: React.FC<ValueCardProps> = ({
  title,
  description,
}) => {
  return (
    <div className="bg-brand-gray-lightest rounded-lg p-6 w-full max-w-[440px] h-[250px] flex flex-col">
      <div className="mb-3">
        <ValueIcon />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p
        className="text-base text-gray-700 leading-relaxed flex-1 overflow-hidden"
        dangerouslySetInnerHTML={{ __html: description }}
      />
    </div>
  );
};
