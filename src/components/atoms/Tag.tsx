import React from 'react';

export type TagTone = 'accent' | 'success' | 'warning' | 'neutral';

export interface TagProps {
  label: string;
  tone?: TagTone;
  className?: string;
}

const toneStyles: Record<TagTone, string> = {
  accent: 'bg-brand-yellow-main text-brand-black',
  success: 'bg-brand-green text-brand-white',
  warning: 'bg-brand-orange text-brand-white',
  neutral: 'bg-brand-gray-medium text-brand-white',
};

/**
 * Tag component for small labels and badges
 * Used to highlight important information like discounts or status
 */
export const Tag: React.FC<TagProps> = ({
  label,
  tone = 'neutral',
  className = '',
}) => {
  const baseClassName = 'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold';
  const toneClassName = toneStyles[tone];
  const combinedClassName = `${baseClassName} ${toneClassName} ${className}`;

  return (
    <span className={combinedClassName}>
      {label}
    </span>
  );
};



