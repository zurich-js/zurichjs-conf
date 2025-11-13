/**
 * Team Request Success Dialog
 * Displays a success message after team quote request is submitted
 */

import React from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/atoms';
import { CheckCircle2Icon } from 'lucide-react';

export interface TeamRequestSuccessDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  /**
   * Callback to close the dialog
   */
  onClose: () => void;
  /**
   * Email address where quote will be sent
   */
  email: string | null;
  /**
   * Company name from the request
   */
  company: string | null;
  /**
   * Number of tickets requested
   */
  quantity: number | null;
}

/**
 * TeamRequestSuccessDialog component
 * Shows confirmation that team quote request has been submitted successfully
 */
export const TeamRequestSuccessDialog: React.FC<TeamRequestSuccessDialogProps> = ({
  isOpen,
  onClose,
  email,
  company,
  quantity,
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
              {/* Success icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center">
                  <CheckCircle2Icon
                    size={40}
                    className="text-brand-green"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Header */}
              <DialogTitle className="text-2xl font-bold text-brand-white mb-4 text-center">
                Team Request Submitted!
              </DialogTitle>

              {/* Content */}
              <div className="space-y-4 mb-6">
                <p className="text-brand-gray-light text-center">
                  Thank you for your interest in our team packages! We&apos;ve received your request
                  and our team will review it shortly.
                </p>

                {/* Request details */}
                {(company || quantity || email) && (
                  <div className="bg-brand-gray-dark/50 rounded-lg p-4 space-y-2">
                    {company && (
                      <div className="flex justify-between">
                        <span className="text-sm text-brand-gray-light">Company:</span>
                        <span className="text-brand-white font-medium">{company}</span>
                      </div>
                    )}
                    {quantity && (
                      <div className="flex justify-between">
                        <span className="text-sm text-brand-gray-light">Tickets:</span>
                        <span className="text-brand-white font-medium">{quantity}</span>
                      </div>
                    )}
                    {email && (
                      <div className="flex justify-between">
                        <span className="text-sm text-brand-gray-light">Email:</span>
                        <span className="text-brand-white font-medium">{email}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Info box */}
                <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-lg p-4">
                  <p className="text-sm text-gray-300">
                    <strong className="text-brand-white">What&apos;s next?</strong>
                    <br />
                    Our team will prepare a custom quote for your team package and send it to{' '}
                    <strong className="text-brand-white">{email}</strong> within 1 business day.
                    The quote will include special pricing, payment options, and next steps.
                  </p>
                </div>

                <p className="text-sm text-brand-gray-light text-center">
                  Questions? Contact us at{' '}
                  <a
                    href="mailto:hello@zurichjs.com"
                    className="text-brand-primary hover:underline"
                  >
                    hello@zurichjs.com
                  </a>
                </p>
              </div>

              {/* Close button */}
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

