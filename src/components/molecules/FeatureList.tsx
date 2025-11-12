import React from 'react';
import { CircleDashedIcon, CheckIcon, CheckCheckIcon } from 'lucide-react';

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
   * Variant that affects icon styling for extra features
   */
  variant?: 'standard' | 'vip' | 'member';
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
  variant = 'standard',
  className = '',
}) => {
  if (!features || features.length === 0) {
    return null;
  }

  const isVip = variant === 'vip';

  return (
    <ul className={`flex flex-col gap-2 ${className}`} role="list">
      {features.map((feature, index) => {
        const kind = feature.kind || 'included';
        const isExtra = kind === 'extra';
        const isExcluded = kind === 'excluded';

        // VIP extra features use double-check, others use dot
        const iconType = isExcluded
          ? CircleDashedIcon
          : isExtra
            ? CheckCheckIcon
            : CheckIcon;
        const iconColor = variant === 'standard' ? 'text-brand-green' : isVip ? 'text-brand-orange' : 'text-brand-white';

        return (
          <li
            key={`${feature.label}-${index}`}
            className={`flex items-start gap-2.5 text-brand-white`}
          >
            {
              React.createElement(iconType, {
                className: iconColor,
                size: 20,
                strokeWidth: 2,
                'aria-label': isExcluded ? 'Not included' : isExtra ? 'Premium feature' : 'Included feature'
              })
            }
            <span className="text-sm flex-1">
              {feature.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

