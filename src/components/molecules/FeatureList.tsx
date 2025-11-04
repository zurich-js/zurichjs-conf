import React from 'react';
import { Icon } from '@/components/atoms/Icon';

export interface Feature {
  /**
   * Feature label/description
   */
  label: string;
  /**
   * Feature kind: included (green check) or extra (orange dot)
   */
  kind?: 'included' | 'extra';
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
 * Green check for included features, orange dot for extra/premium features
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
        const isExtra = feature.kind === 'extra';
        const iconType = isExtra ? 'dot' : 'check';
        const iconColor = isExtra ? 'accent' : 'success';
        
        return (
          <li
            key={`${feature.label}-${index}`}
            className="flex items-start gap-3 text-gray-200"
          >
            <Icon
              type={iconType}
              color={iconColor}
              size={20}
              aria-label={isExtra ? 'Premium feature' : 'Included feature'}
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

