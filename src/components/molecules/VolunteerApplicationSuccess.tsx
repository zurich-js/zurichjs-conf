/**
 * Volunteer Application Success Modal
 * Displays confirmation after successful volunteer application submission
 */

import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/atoms';
import { CheckCircle2Icon } from 'lucide-react';

export interface VolunteerApplicationSuccessProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string | null;
}

export function VolunteerApplicationSuccess({
  isOpen,
  onClose,
  applicationId,
}: VolunteerApplicationSuccessProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
          <DialogBackdrop className="fixed inset-0 bg-brand-black/80 backdrop-blur-sm" />

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
                  Application Submitted!
                </DialogTitle>
                <p className="text-brand-gray-light">
                  Thank you for applying to volunteer at ZurichJS Conf. We&apos;ve received your
                  application and will review it soon.
                </p>
              </div>

              {/* Details */}
              <div className="bg-brand-gray-dark rounded-2xl p-4 mb-6 space-y-3">
                {applicationId && (
                  <div>
                    <p className="text-sm font-semibold text-brand-gray-light mb-1">
                      Application Reference
                    </p>
                    <p className="text-brand-white font-mono text-sm">{applicationId}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-brand-gray-light mb-1">
                    What happens next?
                  </p>
                  <ul className="text-sm text-brand-gray-light space-y-1">
                    <li>&#8226; Our team will review your application</li>
                    <li>&#8226; We&apos;ll contact you via email with our decision</li>
                    <li>&#8226; Keep an eye on your inbox (and spam folder)</li>
                  </ul>
                </div>
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
}
