import React, { ReactNode } from 'react';

export interface DiagonalSectionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Composable diagonal section component
 * Creates a sharp diagonal division from black to white
 * Speaker cards span across the diagonal transition
 */
export const DiagonalSection: React.FC<DiagonalSectionProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      {/* Diagonal Background - Sharp division from black to white, no fade */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(175deg, #000000 0%, #000000 50%, #ffffff 50.01%, #ffffff 100%)',
        }}
        aria-hidden="true"
      />

      {/* Content Container */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
};

