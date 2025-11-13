/**
 * Verification Success Modal
 * Displays a success message after student/unemployed verification is submitted
 */

import React from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/atoms';
import { CheckCircle2Icon } from 'lucide-react';

export interface VerificationSuccessModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;
  /**
   * Callback to close the modal
   */
  onClose: () => void;
  /**
   * Email address where verification link will be sent
   */
  email: string | null;
  /**
   * Verification ID for reference
   */
  verificationId: string | null;
}

/**
 * VerificationSuccessModal component
 * Shows a confirmation message after successful verification submission
 */
export const VerificationSuccessModal: React.FC<VerificationSuccessModalProps> = ({
  isOpen,
  onClose,
  email,
  verificationId,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
          {/* Backdrop */}
          <DialogBackdrop className="fixed inset-0 bg-brand-black/80 backdrop-blur-sm" />

          {/* Center container */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel className="relative w-full max-w-lg bg-brand-gray-darkest rounded-[28px] p-6 md:p-8">
              {/* Success Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2Icon size={32} className="stroke-green-500" />
                </div>
              </div>

              {/* Header */}
              <div className="mb-6 text-center">
                <DialogTitle className="text-2xl font-bold text-brand-white mb-3">
                  Verification Submitted!
                </DialogTitle>
                <p className="text-brand-gray-light">
                  Thank you for submitting your verification request. We&apos;ve received your information and will review it shortly.
                </p>
              </div>

              {/* Details */}
              <div className="bg-brand-gray-dark rounded-2xl p-4 mb-6 space-y-3">
                {verificationId && (
                  <div>
                    <p className="text-sm font-semibold text-brand-gray-light mb-1">Verification ID</p>
                    <p className="text-brand-white font-mono text-sm">{verificationId}</p>
                  </div>
                )}
                {email && (
                  <div>
                    <p className="text-sm font-semibold text-brand-gray-light mb-1">Email Address</p>
                    <p className="text-brand-white">{email}</p>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="primary"
                  onClick={onClose}
                  className="w-full sm:w-auto"
                >
                  Got it, thanks!
                </Button>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

