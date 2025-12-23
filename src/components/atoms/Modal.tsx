/**
 * Modal Component
 * Reusable HeadlessUI Dialog wrapper with consistent styling
 */

import React from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import { X } from 'lucide-react';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Maximum width of the modal */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  /** Visual variant */
  variant?: 'default' | 'dark';
  /** Whether to show the close button */
  showCloseButton?: boolean;
  /** Custom header content */
  headerContent?: React.ReactNode;
  /** Whether to disable closing when clicking outside */
  static?: boolean;
  /** Z-index for the modal (useful for nested modals) */
  zIndex?: number;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  variant = 'default',
  showCloseButton = true,
  headerContent,
  static: isStatic = false,
  zIndex = 50,
}: ModalProps) {
  const isDark = variant === 'dark';

  return (
    <Dialog
      open={isOpen}
      onClose={isStatic ? () => {} : onClose}
      className="relative"
      style={{ zIndex }}
    >
      {/* Backdrop - covers everything and handles click-outside */}
      <DialogBackdrop
        transition
        className={`fixed inset-0 backdrop-blur-sm transition-opacity duration-200 data-[closed]:opacity-0 ${
          isDark ? 'bg-black/80' : 'bg-black/50'
        }`}
      />

      {/* Scroll container - allows modal content to scroll while keeping centered */}
      <div className="fixed inset-0 overflow-y-auto">
        {/* Center container with padding */}
        <div className="flex min-h-full items-center justify-center p-4">
          <DialogPanel
            transition
            className={`relative w-full ${SIZE_CLASSES[size]} rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col transition-all duration-200 data-[closed]:opacity-0 data-[closed]:scale-95 ${
              isDark ? 'bg-brand-gray-darkest' : 'bg-white'
            }`}
          >
            {/* Header */}
            {(title || headerContent || showCloseButton) && (
              <div
                className={`flex items-start justify-between p-4 sm:p-6 border-b shrink-0 ${
                  isDark ? 'border-brand-gray-medium' : 'border-gray-200'
                }`}
              >
                {headerContent || (
                  <div className="min-w-0 flex-1">
                    {title && (
                      <DialogTitle
                        className={`text-lg font-bold ${isDark ? 'text-white' : 'text-black'}`}
                      >
                        {title}
                      </DialogTitle>
                    )}
                    {subtitle && (
                      <p
                        className={`text-sm mt-1 ${
                          isDark ? 'text-brand-gray-light' : 'text-gray-600'
                        }`}
                      >
                        {subtitle}
                      </p>
                    )}
                  </div>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className={`p-2 rounded-lg transition-colors cursor-pointer shrink-0 ml-4 ${
                      isDark
                        ? 'text-brand-gray-light hover:text-white hover:bg-brand-gray-medium'
                        : 'text-gray-500 hover:text-black hover:bg-gray-100'
                    }`}
                    aria-label="Close modal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Content with overflow scroll */}
            <div className="flex-1 overflow-y-auto">{children}</div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

/**
 * Modal Body - use for consistent padding in modal content
 */
export function ModalBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-4 sm:p-6 ${className}`}>{children}</div>;
}

/**
 * Modal Footer - use for action buttons at the bottom
 */
export function ModalFooter({
  children,
  variant = 'default',
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'dark';
  className?: string;
}) {
  const isDark = variant === 'dark';

  return (
    <div
      className={`p-4 sm:p-6 border-t shrink-0 ${
        isDark ? 'border-brand-gray-medium bg-brand-gray-darkest/50' : 'border-gray-200 bg-gray-50'
      } ${className}`}
    >
      {children}
    </div>
  );
}
