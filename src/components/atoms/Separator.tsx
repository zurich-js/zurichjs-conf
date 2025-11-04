import React from 'react';

export type SeparatorVariant = 
  | 'horizontal'
  | 'vertical'
  | 'diagonal-top'
  | 'diagonal-bottom'
  | 'diagonal-subtle'
  | 'diagonal-transition';

export type SeparatorColor = 'default' | 'strong' | 'subtle' | 'black' | 'white';

export interface SeparatorProps {
  /**
   * Visual style of the separator
   */
  variant?: SeparatorVariant;
  
  /**
   * Color intensity or specific color
   */
  color?: SeparatorColor;
  
  /**
   * Custom fill color for SVG separators (overrides color prop)
   */
  fill?: string;
  
  /**
   * Background color for diagonal transitions
   */
  backgroundColor?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Separator atom component
 * Provides various separator styles including horizontal lines, vertical dividers,
 * and diagonal SVG separators used throughout the site
 * 
 * @example
 * // Horizontal divider
 * <Separator variant="horizontal" />
 * 
 * @example
 * // Diagonal separator at section top
 * <Separator variant="diagonal-top" fill="#19191B" />
 * 
 * @example
 * // Vertical divider in countdown
 * <Separator variant="vertical" className="h-12" />
 */
export const Separator: React.FC<SeparatorProps> = ({
  variant = 'horizontal',
  color = 'default',
  fill,
  backgroundColor,
  className = '',
}) => {
  // Color mapping for horizontal/vertical separators
  const colorMap: Record<SeparatorColor, string> = {
    default: 'rgba(255, 255, 255, 0.08)',
    strong: 'rgba(255, 255, 255, 0.12)',
    subtle: 'rgba(255, 255, 255, 0.04)',
    black: '#000000',
    white: '#FFFFFF',
  };

  // Horizontal separator (border-based)
  if (variant === 'horizontal') {
    return (
      <hr
        className={`border-0 ${className}`}
        style={{
          borderTopWidth: '1px',
          borderTopStyle: 'solid',
          borderTopColor: fill || colorMap[color],
        }}
        role="separator"
        aria-hidden="true"
      />
    );
  }

  // Vertical separator (border-based)
  if (variant === 'vertical') {
    return (
      <div
        className={`w-px ${className}`}
        style={{
          backgroundColor: fill || colorMap[color],
        }}
        role="separator"
        aria-hidden="true"
      />
    );
  }

  // Diagonal separator at top of section
  if (variant === 'diagonal-top') {
    const fillColor = fill || colorMap[color];
    
    return (
      <div
        className={`absolute top-0 left-0 right-0 h-16 overflow-hidden pointer-events-none ${className}`}
        aria-hidden="true"
      >
        <svg
          className="absolute top-0 left-0 w-full h-full"
          viewBox="0 0 1440 64"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 64L1440 0V64H0Z"
            fill={fillColor}
          />
        </svg>
      </div>
    );
  }

  // Diagonal separator at bottom of section
  if (variant === 'diagonal-bottom') {
    const fillColor = fill || colorMap[color];
    
    return (
      <div
        className={`absolute bottom-0 left-0 right-0 h-16 overflow-hidden pointer-events-none ${className}`}
        aria-hidden="true"
      >
        <svg
          className="absolute bottom-0 left-0 w-full h-full"
          viewBox="0 0 1440 64"
          preserveAspectRatio="none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0L1440 64V0H0Z"
            fill={fillColor}
          />
        </svg>
      </div>
    );
  }

  // Subtle diagonal separator (like footer)
  if (variant === 'diagonal-subtle') {
    const fillColor = fill || 'rgba(255,255,255,0.08)';
    
    return (
      <div
        className={`absolute top-0 left-0 right-0 h-px overflow-hidden ${className}`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 1200 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-20"
          preserveAspectRatio="none"
        >
          <path
            d="M0 20L1200 0V20H0Z"
            fill={fillColor}
          />
        </svg>
      </div>
    );
  }

  // Diagonal transition (like schedule section bottom)
  if (variant === 'diagonal-transition') {
    const bg = backgroundColor || '#FFFFFF';
    const fg = fill || '#000000';
    
    return (
      <div className={`relative h-24 md:h-32 overflow-hidden ${className}`} aria-hidden="true">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          <polygon points="0,0 100,0 100,100 0,100" fill={bg} />
          <polygon points="0,50 100,0 100,100 0,100" fill={fg} />
        </svg>
      </div>
    );
  }

  return null;
};

