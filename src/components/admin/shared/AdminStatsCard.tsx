/**
 * Shared Admin Stats Card Component
 * Unified stats card for consistent display across admin sections
 */

import type { LucideIcon } from 'lucide-react';

export interface AdminStatsCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  valueColor?: string;
  borderColor?: string;
}

export function AdminStatsCard({
  label,
  value,
  subValue,
  icon: Icon,
  iconBg = 'bg-gray-100',
  iconColor = 'text-gray-600',
  valueColor = 'text-black',
  borderColor = 'border-gray-200',
}: AdminStatsCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border ${borderColor} p-4 hover:shadow-sm transition-shadow`}
    >
      {Icon && (
        <div className={`inline-flex p-2.5 rounded-lg ${iconBg} mb-3`}>
          <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
        </div>
      )}
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-xl sm:text-2xl font-bold ${valueColor} tabular-nums`}>
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-gray-500 mt-1">{subValue}</p>
      )}
    </div>
  );
}

export interface AdminStatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
}

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
  5: 'grid-cols-2 md:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
};

export function AdminStatsGrid({ children, columns = 4 }: AdminStatsGridProps) {
  return (
    <div className={`grid ${GRID_COLS[columns]} gap-3 sm:gap-4`}>
      {children}
    </div>
  );
}

export function AdminStatsCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
      <div className="h-10 w-10 bg-gray-200 rounded-lg mb-3" />
      <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
      <div className="h-7 bg-gray-200 rounded w-12" />
    </div>
  );
}
