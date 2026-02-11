import React from 'react';
import Image from 'next/image';

export interface LogoProps {
  className?: string;
  width?: number;
  height?: number;
}

/**
 * ZurichJS logo component
 * Official ZurichJS branding
 */
export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  width = 180, 
  height = 48 
}) => {
  return (
    <div 
      className={`inline-flex items-center ${className}`}
      style={{ width, height: 'auto' }}
    >
      <Image
        src="/images/logo/zurichjs-full.svg"
        alt="ZurichJS"
        width={width}
        height={height}
        className="h-auto"
        priority
        unoptimized
      />
    </div>
  );
};

