/**
 * Admin Modal Component
 * Reusable modal wrapper for admin pages with consistent styling
 */

import React, { useCallback, useEffect } from 'react';
import { X } from 'lucide-react';

interface AdminModalProps {
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  /** Max width of modal - defaults to 'md' */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'screen-xl';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'screen-xl';
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
  '3xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-4xl',
  'screen-xl': 'sm:max-w-screen-xl',
};

interface AdminModalFooterProps {
  onCancel: () => void;
  onConfirm: () => void;
  cancelText?: string;
  confirmText?: string;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'danger';
}

export function AdminModal({
  isOpen = true,
  onClose,
  title,
  subtitle,
  description,
  children,
  size = 'md',
  maxWidth,
  showHeader = true,
  headerActions,
  footer,
}: AdminModalProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const width = maxWidth ?? size;
  const details = description ?? subtitle;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative flex max-h-[100dvh] w-full flex-col bg-white text-black shadow-xl sm:mx-4 sm:max-h-[85vh] sm:rounded-xl ${SIZE_CLASSES[width]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {showHeader ? (
          <div className="shrink-0 bg-brand-primary px-4 py-3 sm:rounded-t-xl">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <h3 id="modal-title" className="truncate text-base font-bold text-black sm:text-lg">
                  {title}
                </h3>
                {details ? (
                  <div className="truncate text-xs text-black/70 sm:text-sm">{details}</div>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                {headerActions}
                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer rounded-lg p-1.5 hover:bg-black/10 sm:p-1"
                  aria-label="Close modal"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex shrink-0 items-center justify-between border-b border-brand-gray-lightest px-4 py-3">
            <h3 id="modal-title" className="text-base font-bold text-black sm:text-lg">
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 hover:bg-text-brand-gray-lightest"
              aria-label="Close modal"
            >
              <X className="size-5" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-brand-gray-lightest bg-gray-50 px-4 py-3 sm:rounded-b-xl sm:px-6">
            <div className="flex justify-end gap-3">{footer}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdminModalFooter({
  onCancel,
  onConfirm,
  cancelText = 'Cancel',
  confirmText = 'Save',
  isLoading = false,
  disabled = false,
  variant = 'primary',
}: AdminModalFooterProps) {
  const confirmClasses =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-brand-primary text-black hover:bg-[#E5D665]';

  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        disabled={isLoading}
        className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-black hover:bg-text-brand-gray-lightest disabled:opacity-50"
      >
        {cancelText}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled || isLoading}
        className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${confirmClasses}`}
      >
        {isLoading ? 'Loading...' : confirmText}
      </button>
    </>
  );
}
