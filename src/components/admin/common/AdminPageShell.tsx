import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AdminPageShellProps {
  children: ReactNode;
  className?: string;
}

export function AdminPageShell({ children, className }: AdminPageShellProps) {
  return (
    <main className={cn('mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8', className)}>
      <div className="min-h-[calc(100vh-7.5rem)] space-y-6">{children}</div>
    </main>
  );
}
