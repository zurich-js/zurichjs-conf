import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AdminMobileCardProps {
  children: ReactNode;
  className?: string;
}

export function AdminMobileCard({ children, className }: AdminMobileCardProps) {
  return (
    <div className={cn('rounded-xl border border-brand-gray-lightest bg-white p-4 shadow-sm', className)}>
      {children}
    </div>
  );
}

interface AdminMobileListProps<TData> {
  rows: TData[];
  renderCard: (row: TData, index: number) => ReactNode;
  emptyState?: ReactNode;
  className?: string;
}

export function AdminMobileList<TData>({
  rows,
  renderCard,
  emptyState,
  className,
}: AdminMobileListProps<TData>) {
  if (rows.length === 0) {
    return (
      <div className={cn('space-y-4 p-4 md:hidden', className)}>
        {emptyState ?? <AdminMobileCard>No results found.</AdminMobileCard>}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4 p-4 md:hidden', className)}>
      {rows.map((row, index) => renderCard(row, index))}
    </div>
  );
}
