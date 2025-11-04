import React from 'react';

export type TagTone = 'accent' | 'success' | 'warning' | 'neutral';

export interface TagProps {
  label: string;
  tone?: TagTone;
  className?: string;
}

const toneStyles: Record<TagTone, string> = {
  accent: 'bg-[#F1E271]/10 text-[#F1E271] border-[#F1E271]/20',
  success: 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20',
  warning: 'bg-[#F97316]/10 text-[#F97316] border-[#F97316]/20',
  neutral: 'bg-[#64748B]/10 text-[#64748B] border-[#64748B]/20',
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
  const baseClassName = 'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border';
  const toneClassName = toneStyles[tone];
  const combinedClassName = `${baseClassName} ${toneClassName} ${className}`;

  return (
    <span className={combinedClassName}>
      {label}
    </span>
  );
};

