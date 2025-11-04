import React from 'react';
import { Icon } from '@/components/atoms/Icon';

export interface Feature {
  /**
   * Feature label/description
   */
  label: string;
  /**
   * Feature kind: included (green check), extra (orange dot), or excluded (gray minus)
   */
  kind?: 'included' | 'extra' | 'excluded';
}

export interface FeatureListProps {
  /**
   * List of features to display
   */
  features: Feature[];
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * FeatureList component displays a list of features with appropriate icons
 * Green check for included features, orange dot for extra/premium features, gray minus for excluded
 */
export const FeatureList: React.FC<FeatureListProps> = ({
  features,
  className = '',
}) => {
  if (!features || features.length === 0) {
    return null;
  }

  return (
    <ul className={`flex flex-col gap-3 ${className}`} role="list">
      {features.map((feature, index) => {
        const kind = feature.kind || 'included';
        const isExtra = kind === 'extra';
        const isExcluded = kind === 'excluded';
        
        const iconType = isExcluded ? 'minus' : isExtra ? 'dot' : 'check';
        const iconColor = isExcluded ? 'muted' : isExtra ? 'accent' : 'success';
        const textColor = isExcluded ? 'text-gray-500' : 'text-gray-200';
        
        return (
          <li
            key={`${feature.label}-${index}`}
            className={`flex items-start gap-3 ${textColor}`}
          >
            <Icon
              type={iconType}
              color={iconColor}
              size={20}
              aria-label={isExcluded ? 'Not included' : isExtra ? 'Premium feature' : 'Included feature'}
            />
            <span className="text-sm md:text-base leading-relaxed flex-1">
              {feature.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

