import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AdminOverviewCardItem {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  valueClassName?: string;
}

interface AdminOverviewCardsProps {
  items: AdminOverviewCardItem[];
  isLoading?: boolean;
  columnsClassName?: string;
  cardClassName?: string;
}

export function AdminOverviewCards({
  items,
  isLoading = false,
  columnsClassName,
  cardClassName,
}: AdminOverviewCardsProps) {
  if (isLoading) {
    return (
      <div className={cn('AdminOverviewCards mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4', columnsClassName)}>
        {items.map((item) => (
          <div key={item.label} className={cn('min-h-32 rounded-xl border border-brand-gray-lightest bg-white p-5 shadow-sm animate-pulse', cardClassName)}>
            <div className="mb-4 h-4 w-24 rounded b[a-z]-brand-gray-lightest" />
            <div className="h-8 w-20 rounded bg-text-brand-gray-lightest" />
            <div className="mt-3 h-3 w-28 rounded bg-brand-gray-lightest" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4', columnsClassName)}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className={cn('min-h-32 rounded-xl border border-brand-gray-lightest bg-white p-5 shadow-sm', cardClassName)}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-brand-gray-medium">{item.label}</p>
              {Icon ? <Icon className="h-4 w-4 text-brand-gray-medium" /> : null}
            </div>
            <p className={cn('mt-4 text-3xl font-semibold text-black', item.valueClassName)}>{item.value}</p>
            {item.subtitle ? <p className="mt-2 text-sm text-brand-gray-medium">{item.subtitle}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
