/**
 * Pill
 * Color-coded status badge for admin UI
 */

import type { ReactNode } from 'react';

const TONE_CLASSES = {
  red: 'bg-red-50 text-brand-red ring-red-200',
  green: 'bg-green-50 text-green-700 ring-green-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  blue: 'bg-blue-50 text-brand-blue ring-blue-200',
} as const;

export function Pill({ children, tone }: { children: ReactNode; tone: keyof typeof TONE_CLASSES }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
