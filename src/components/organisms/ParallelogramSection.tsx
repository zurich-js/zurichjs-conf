import React, { ReactNode } from "react";

export interface ParallelogramSectionProps {
  children: ReactNode;
  backgroundColor?: string;
  skewDegree?: number;
  className?: string;
}

export const ParallelogramSection: React.FC<ParallelogramSectionProps> = ({
  children,
  backgroundColor = "#f3f4f6", // default gray-100
  skewDegree = 3,
  className = "",
}) => {
  return (
    <div
      className={`relative ${className}`}
      style={{
        marginLeft: "calc(-50vw + 50%)",
        marginRight: "calc(-50vw + 50%)",
        width: "100vw",
      }}
    >
      {/* Parallelogram Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor,
          transform: `skewY(${skewDegree}deg)`,
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative py-24 max-w-[800px] mx-auto px-4">
        {children}
      </div>
    </div>
  );
};
