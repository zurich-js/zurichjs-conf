import React from 'react';

export type IconType = 'check' | 'dot' | 'star' | 'minus';
export type IconColor = 'success' | 'warning' | 'accent' | 'muted';

export interface IconProps {
  /**
   * Icon type to render
   */
  type: IconType;
  /**
   * Icon color variant
   */
  color?: IconColor;
  /**
   * Size in pixels
   */
  size?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Accessible label
   */
  'aria-label'?: string;
}

const colorClasses: Record<IconColor, string> = {
  success: 'text-success',
  warning: 'text-warning',
  accent: 'text-vip',
  muted: 'text-text-muted',
};

/**
 * Check icon (for included features)
 */
const CheckIcon: React.FC<{ size: number; className: string }> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
      fill="currentColor"
    />
  </svg>
);

/**
 * Dot icon (for extra/highlighted features)
 */
const DotIcon: React.FC<{ size: number; className: string }> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="12" r="6" fill="currentColor" />
  </svg>
);

/**
 * Star icon (for premium features)
 */
const StarIcon: React.FC<{ size: number; className: string }> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      fill="currentColor"
    />
  </svg>
);

/**
 * Minus icon (for excluded features)
 */
const MinusIcon: React.FC<{ size: number; className: string }> = ({ size, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M19 13H5v-2h14v2z"
      fill="currentColor"
    />
  </svg>
);

/**
 * Icon component for rendering feature status icons
 * Supports check marks, dots, and stars with color variants
 */
export const Icon: React.FC<IconProps> = ({
  type,
  color = 'success',
  size = 20,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const colorClass = colorClasses[color];
  const combinedClassName = `inline-flex items-center justify-center flex-shrink-0 ${colorClass} ${className}`;

  const iconMap = {
    check: CheckIcon,
    dot: DotIcon,
    star: StarIcon,
    minus: MinusIcon,
  };

  const IconComponent = iconMap[type];

  return (
    <span className={combinedClassName} role="img" aria-label={ariaLabel || type}>
      <IconComponent size={size} className="flex-shrink-0" />
    </span>
  );
};

