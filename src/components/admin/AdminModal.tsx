/**
 * Admin Modal Component
 * Reusable modal wrapper for admin pages with consistent styling
 */

import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Max width of modal - defaults to 'md' */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  /** Show header with yellow background */
  showHeader?: boolean;
  /** Header actions (buttons) to show next to close button */
  headerActions?: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
}

const SIZE_CLASSES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '4xl': 'sm:max-w-4xl',
};

export function AdminModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  showHeader = true,
  headerActions,
  footer,
}: AdminModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`relative w-full ${SIZE_CLASSES[size]} sm:mx-4 bg-white sm:rounded-xl text-black shadow-xl flex flex-col max-h-[100dvh] sm:max-h-[85vh]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        {showHeader && (
          <div className="bg-[#F1E271] px-4 py-3 shrink-0 sm:rounded-t-xl">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <h3 id="modal-title" className="text-base sm:text-lg font-bold text-black truncate">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-black/70 truncate">{subtitle}</p>
                )}
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {headerActions}
                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-1 rounded-lg hover:bg-black/10 cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Simple header for modals without yellow bar */}
        {!showHeader && (
          <div className="px-4 py-3 border-b border-gray-200 shrink-0 flex items-center justify-between">
            <h3 id="modal-title" className="text-base sm:text-lg font-bold text-black">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-4 sm:px-6 py-3 border-t border-gray-200 shrink-0 bg-gray-50 sm:rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Modal footer with standard button layout
 */
export function AdminModalFooter({
  onCancel,
  onConfirm,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  isLoading = false,
  disabled = false,
  variant = 'primary',
}: {
  onCancel: () => void;
  onConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'danger';
}) {
  const confirmClasses =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : 'bg-[#F1E271] hover:bg-[#E5D665] text-black';

  return (
    <div className="flex justify-end gap-3">
      <button
        onClick={onCancel}
        disabled={isLoading}
        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-black hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
      >
        {cancelText}
      </button>
      <button
        onClick={onConfirm}
        disabled={disabled || isLoading}
        className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer ${confirmClasses}`}
      >
        {isLoading ? 'Loading...' : confirmText}
      </button>
    </div>
  );
}
