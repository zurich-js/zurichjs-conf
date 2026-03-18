/**
 * Ticket Waves Info Modal
 * Explains how sponsored ticket waves work and collects emails for notifications
 */

import React, { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import { AnimatePresence } from 'framer-motion';
import { XIcon, HeartHandshakeIcon, BellRingIcon, CheckCircleIcon } from 'lucide-react';
import { Button, Input } from '@/components/atoms';

export interface TicketWavesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TicketWavesModal: React.FC<TicketWavesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'other' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setIsSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setError(null);
      setIsSubmitting(false);
      setIsSubscribed(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
          <DialogBackdrop className="fixed inset-0 bg-brand-black/80 backdrop-blur-sm" />

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <DialogPanel className="relative w-full max-w-lg bg-brand-gray-darkest rounded-[28px] p-6 md:p-8 max-h-[90vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 cursor-pointer w-10 h-10 flex items-center justify-center rounded-full hover:bg-brand-gray-dark transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary"
                aria-label="Close modal"
                autoFocus
              >
                <XIcon size={20} className="text-brand-white" />
              </button>

              {/* Icon */}
              <div className="mb-4">
                <div className="w-12 h-12 rounded-full bg-brand-primary/15 flex items-center justify-center">
                  <HeartHandshakeIcon size={24} className="text-brand-primary" />
                </div>
              </div>

              {/* Header */}
              <DialogTitle className="text-xl font-bold text-brand-white mb-2">
                How sponsored tickets work
              </DialogTitle>

              <div className="space-y-4 mb-6">
                <p className="text-brand-gray-light text-sm leading-relaxed">
                  We release student &amp; unemployed tickets in waves. Each wave is made possible
                  by our sponsors, who help us keep these tickets affordable for those who need them most.
                </p>
                <p className="text-brand-gray-light text-sm leading-relaxed">
                  When a wave sells out, we work with sponsors to unlock more tickets.
                  Subscribe below and we&apos;ll notify you as soon as the next wave goes live.
                </p>
              </div>

              {/* Subscribe form */}
              {isSubscribed ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
                  <CheckCircleIcon size={20} className="text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-green-400 font-semibold text-sm">You&apos;re on the list!</p>
                    <p className="text-green-400/80 text-sm mt-1">
                      We&apos;ll email you when the next wave of tickets becomes available.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  {error && (
                    <p className="text-brand-red text-sm">{error}</p>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="flex-1"
                      aria-label="Email address for ticket notifications"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={isSubmitting}
                      disabled={isSubmitting}
                    >
                      <BellRingIcon size={16} />
                      Notify me
                    </Button>
                  </div>
                  <p className="text-brand-gray-medium text-xs">
                    We&apos;ll only email you about ticket availability. No spam.
                  </p>
                </form>
              )}
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
