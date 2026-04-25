/**
 * Shared Admin Error State
 * Consistent error display with optional retry for admin pages
 */

import { AlertTriangle } from 'lucide-react';

interface AdminErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function AdminErrorState({
  message = 'Something went wrong',
  onRetry,
}: AdminErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-black mb-1">Error</h3>
      <p className="text-sm text-brand-gray-medium max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 text-sm font-medium rounded-lg text-black bg-text-brand-gray-lightest hover:bg-gray-200 transition-all cursor-pointer"
        >
          Try again
        </button>
      )}
    </div>
  );
}
