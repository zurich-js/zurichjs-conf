/**
 * Shared Admin Empty State
 * Consistent empty/no-data display for admin pages
 */

import { type ReactNode } from 'react';

interface AdminEmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function AdminEmptyState({ icon, title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-text-brand-gray-lightest flex items-center justify-center mb-4 text-brand-gray-medium">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-black mb-1">{title}</h3>
      {description && <p className="text-sm text-brand-gray-medium max-w-sm">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-sm font-medium rounded-lg text-black bg-brand-primary hover:bg-[#e8d95e] transition-all cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
