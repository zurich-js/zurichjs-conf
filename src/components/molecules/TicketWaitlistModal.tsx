/**
 * Ticket Waitlist Modal
 * Config-driven modal for sold-out ticket types. Explains the ticket type and,
 * when sold out, collects emails so users can be notified when tickets return.
 * Used for both student/unemployed (sponsor-funded waves) and VIP tickets.
 */

import React, { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import { AnimatePresence } from 'framer-motion';
import { XIcon, BellRingIcon, CheckCircleIcon, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/atoms';
import type { TicketWaitlistType } from '@/lib/email';

/**
 * Static content describing a single ticket waitlist type.
 */
export interface TicketWaitlistModalConfig {
  /** Waitlist type sent to the API / Resend audience */
  waitlistType: TicketWaitlistType;
  /** Header icon (lucide) */
  icon: LucideIcon;
  /** Modal title */
  title: string;
  /** Intro paragraph explaining the ticket type */
  description: string;
  /** Optional "how it works" section, always shown when provided */
  infoSection?: {
    heading: string;
    steps: string[];
  };
  /** Copy shown in the sold-out callout above the subscribe form */
  soldOut: {
    heading: string;
    body: string;
  };
  /** Label above the email input */
  notifyLabel: string;
  /** Confirmation message after a successful subscription */
  successMessage: string;
}

export interface TicketWaitlistModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Whether tickets are currently sold out */
  isSoldOut: boolean;
  /** Content + waitlist type for this ticket */
  config: TicketWaitlistModalConfig;
}

/**
 * TicketWaitlistModal component
 * Explains a ticket type and collects emails for notifications when sold out
 */
export const TicketWaitlistModal: React.FC<TicketWaitlistModalProps> = ({
  isOpen,
  onClose,
  isSoldOut,
  config,
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const Icon = config.icon;
  const inputId = `${config.waitlistType}-notify-email`;

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/tickets/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: config.waitlistType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe');
      }

      setIsSubscribed(true);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setEmail('');
        setError(null);
        setIsSubscribed(false);
      }, 300);
      return () => clearTimeout(timer);
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
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full bg-brand-primary/15 flex items-center justify-center">
                  <Icon size={28} className="text-brand-primary" />
                </div>
              </div>

              {/* Header */}
              <div className="text-center mb-6">
                <DialogTitle className="text-xl font-bold text-brand-white mb-2">
                  {config.title}
                </DialogTitle>
                <p className="text-brand-gray-light text-sm leading-relaxed">
                  {config.description}
                </p>
              </div>

              {/* How it works */}
              {config.infoSection && (
                <div className="bg-brand-gray-dark/50 rounded-xl p-4 mb-6 space-y-3">
                  <h4 className="text-sm font-semibold text-brand-white">
                    {config.infoSection.heading}
                  </h4>
                  <ul className="space-y-2 text-sm text-brand-gray-light">
                    {config.infoSection.steps.map((step, index) => (
                      <li key={index} className="flex gap-2">
                        <span className="text-brand-primary font-bold shrink-0">{index + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Subscribe form - only shown when sold out */}
              {isSoldOut && (
                <>
                  <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-xl p-4 mb-6">
                    <p className="text-sm text-brand-gray-light mb-1">
                      <strong className="text-brand-white">{config.soldOut.heading}</strong>
                    </p>
                    <p className="text-sm text-brand-gray-light">
                      {config.soldOut.body}
                    </p>
                  </div>

                  {isSubscribed ? (
                    <div className="flex items-center gap-3 bg-green-900/30 border border-green-700/40 rounded-xl p-4 mb-4">
                      <CheckCircleIcon size={20} className="text-green-400 shrink-0" />
                      <p className="text-sm text-green-300">
                        {config.successMessage}
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubscribe} className="mb-4">
                      <label htmlFor={inputId} className="flex items-center gap-1.5 text-sm font-semibold text-brand-white mb-2">
                        <BellRingIcon size={14} />
                        {config.notifyLabel}
                      </label>
                      <div className="flex gap-2">
                        <input
                          id={inputId}
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError(null);
                          }}
                          placeholder="your@email.com"
                          disabled={isSubmitting}
                          className="flex-1 h-10 px-4 text-sm bg-brand-gray-dark border border-brand-gray-medium rounded-full text-brand-white placeholder:text-brand-gray-light focus:outline-none focus:ring-2 focus:ring-brand-primary/50 disabled:opacity-50"
                        />
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          loading={isSubmitting}
                          disabled={isSubmitting}
                          className="h-10! shrink-0 min-w-[116px]"
                        >
                          Subscribe
                        </Button>
                      </div>
                      {error && (
                        <p className="text-brand-red text-sm mt-1.5">{error}</p>
                      )}
                    </form>
                  )}
                </>
              )}

              {/* Close action */}
              <div className="flex justify-center">
                <Button variant="ghost" onClick={onClose}>
                  Close
                </Button>
              </div>
            </DialogPanel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
