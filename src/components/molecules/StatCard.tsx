import React from "react";

export interface StatCardProps {
  value: string;
  label: string;
}

export const StatCard: React.FC<StatCardProps> = ({ value, label }) => {
  return (
    <div className="text-center">
      <p className="text-5xl md:text-6xl font-bold text-gray-900 mb-2">
        {value}
      </p>
      <p className="text-base text-gray-600">{label}</p>
    </div>
  );
};
