import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AdminTableToolbarProps {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function AdminTableToolbar({ left, right, className }: AdminTableToolbarProps) {
  return (
    <div className={cn('AdminTableToolbar px-1 py-1 sm:px-0', className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{left}</div>
        <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">{right}</div>
      </div>
    </div>
  );
}
