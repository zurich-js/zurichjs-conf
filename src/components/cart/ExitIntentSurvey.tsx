/**
 * Exit-Intent Survey Modal
 *
 * Shows a quick survey when a user tries to leave the cart page.
 * Captures the reason for abandonment and shows a targeted response.
 * Accessible: focus trap via HeadlessUI Dialog, escape to close, ARIA labels.
 */

import React, { useState, useRef } from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogBackdrop } from '@headlessui/react';
import { X, HelpCircle, Clock, Users, MessageCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/atoms';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';

type ExitReason = 'too_expensive' | 'not_ready' | 'comparing' | 'missing_info' | 'other';

interface ReasonOption {
  value: ExitReason;
  label: string;
  icon: React.ReactNode;
  response: string;
  responseAction?: string;
}

const REASON_OPTIONS: ReasonOption[] = [
  {
    value: 'too_expensive',
    label: "It's too expensive right now",
    icon: <DollarSign className="w-4 h-4" aria-hidden="true" />,
    response: 'Ask a friend who\'s attending for their referral link to get a discount!',
    responseAction: 'Browse FAQ for pricing details',
  },
  {
    value: 'not_ready',
    label: "I'm not ready to buy yet",
    icon: <Clock className="w-4 h-4" aria-hidden="true" />,
    response: "No worries \u2014 your cart is saved. We'll send you a reminder so you don't miss out.",
  },
  {
    value: 'comparing',
    label: "I'm comparing with other events",
    icon: <Users className="w-4 h-4" aria-hidden="true" />,
    response: 'Hundreds of developers have already registered. ZurichJS is the largest JS conference in Switzerland!',
  },
  {
    value: 'missing_info',
    label: 'I need more information',
    icon: <HelpCircle className="w-4 h-4" aria-hidden="true" />,
    response: 'Check out our FAQ for details on the schedule, venue, and what\'s included.',
    responseAction: 'View FAQ',
  },
  {
    value: 'other',
    label: 'Something else',
    icon: <MessageCircle className="w-4 h-4" aria-hidden="true" />,
    response: "We'd love to understand \u2014 drop us a note at hello@zurichjs.com",
  },
];

export interface ExitIntentSurveyProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutStep: string;
  cartTotal: number;
  cartCurrency: string;
  cartItemsCount: number;
  posthogDistinctId?: string;
  email?: string | null;
}

export const ExitIntentSurvey: React.FC<ExitIntentSurveyProps> = ({
  isOpen,
  onClose,
  checkoutStep,
  cartTotal,
  cartCurrency,
  cartItemsCount,
  posthogDistinctId,
  email,
}) => {
  const [selectedReason, setSelectedReason] = useState<ExitReason | null>(null);
  const [otherDetail, setOtherDetail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const shownAtRef = useRef<number>(Date.now());

  const selectedOption = REASON_OPTIONS.find((o) => o.value === selectedReason);

  const handleReasonSelect = (reason: ExitReason): void => {
    setSelectedReason(reason);

    analytics.track('exit_survey_response', {
      reason,
      reason_detail: reason === 'other' ? otherDetail : undefined,
      cart_total: cartTotal,
      cart_currency: cartCurrency,
      cart_items_count: cartItemsCount,
      checkout_step: checkoutStep,
    } as EventProperties<'exit_survey_response'>);
  };

  const handleCtaClick = (): void => {
    if (!selectedOption) return;

    analytics.track('exit_survey_cta_clicked', {
      reason: selectedOption.value,
      response_shown: selectedOption.response,
      cart_total: cartTotal,
      cart_currency: cartCurrency,
    } as EventProperties<'exit_survey_cta_clicked'>);

    // Navigate based on reason
    if (selectedReason === 'missing_info') {
      window.open('/#faq', '_blank');
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!selectedReason || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await fetch('/api/surveys/exit-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: posthogDistinctId || `anon-${Date.now()}`,
          email: email || undefined,
          reason: selectedReason,
          reason_detail: selectedReason === 'other' ? otherDetail : undefined,
          cart_total: cartTotal,
          cart_currency: cartCurrency,
          cart_items_count: cartItemsCount,
          checkout_step: checkoutStep,
          response_shown: selectedOption?.response,
          response_clicked: false,
          posthog_distinct_id: posthogDistinctId,
        }),
      });
    } catch {
      // Non-fatal: survey submission should never block the user
    }

    setHasSubmitted(true);
    setIsSubmitting(false);
  };

  const handleClose = (): void => {
    if (!hasSubmitted && selectedReason) {
      // Submit in background before closing
      handleSubmit();
    }

    if (!selectedReason) {
      const timeShown = (Date.now() - shownAtRef.current) / 1000;
      analytics.track('exit_survey_dismissed', {
        checkout_step: checkoutStep,
        time_shown_seconds: timeShown,
      } as EventProperties<'exit_survey_dismissed'>);
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-surface-card border border-white/10 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-3">
            <DialogTitle className="text-lg font-semibold text-white">
              Before you go...
            </DialogTitle>
            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
              aria-label="Close survey"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 pb-5 space-y-3">
            <p className="text-sm text-gray-400">
              We&apos;d love to know what&apos;s holding you back:
            </p>

            {/* Reason options */}
            <fieldset>
              <legend className="sr-only">Why are you leaving?</legend>
              <div className="space-y-2">
                {REASON_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedReason === option.value
                        ? 'border-brand-primary bg-brand-primary/10 text-white'
                        : 'border-white/10 hover:border-white/20 text-gray-300 hover:text-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exit-reason"
                      value={option.value}
                      checked={selectedReason === option.value}
                      onChange={() => handleReasonSelect(option.value)}
                      className="sr-only"
                    />
                    <span className="flex-shrink-0">{option.icon}</span>
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Other detail input */}
            {selectedReason === 'other' && (
              <textarea
                value={otherDetail}
                onChange={(e) => setOtherDetail(e.target.value)}
                placeholder="Tell us more (optional)"
                className="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-gray-500 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none"
                rows={2}
                maxLength={1000}
              />
            )}

            {/* Targeted response */}
            {selectedOption && (
              <div className="rounded-lg bg-brand-primary/5 border border-brand-primary/20 p-3">
                <p className="text-sm text-gray-300">{selectedOption.response}</p>
                {selectedOption.responseAction && (
                  <button
                    onClick={handleCtaClick}
                    className="mt-2 text-sm font-medium text-brand-primary hover:text-brand-primary-light transition-colors focus:outline-none focus:underline"
                  >
                    {selectedOption.responseAction} &rarr;
                  </button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              {selectedReason && !hasSubmitted ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? 'Sending...' : 'Send feedback'}
                </Button>
              ) : hasSubmitted ? (
                <p className="text-sm text-brand-primary w-full text-center py-2">
                  Thanks for your feedback!
                </p>
              ) : null}
              <Button
                onClick={handleClose}
                variant="outline"
                className={selectedReason && !hasSubmitted ? '' : 'flex-1'}
              >
                {hasSubmitted ? 'Close' : 'Skip'}
              </Button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
};
