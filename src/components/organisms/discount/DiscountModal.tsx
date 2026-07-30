/**
 * Discount Modal
 *
 * Slide-in modal for the discount offer. Two steps:
 * 1. Email gate — advertises the offer and asks for an email.
 * 2. Code reveal — shows the generated code, countdown timer, and
 *    copy-to-clipboard once the email has been submitted.
 * Slides in from the right and positions at bottom-1/3 of the screen.
 * Uses HeadlessUI Dialog.
 */

import { useState, useCallback } from 'react';
import { Dialog, DialogPanel, DialogBackdrop } from '@headlessui/react';
import { motion } from 'framer-motion';
import { X, Copy, Check, ArrowRight } from 'lucide-react';
import { padZero } from '@/hooks/useCountdown';
import type { DiscountData } from '@/lib/discount/types';
import type { DiscountPersonalization } from '@/lib/discount/personalization';
import type { TimeRemaining } from '@/hooks/useCountdown';

interface DiscountModalProps {
  data: DiscountData | null;
  countdown: TimeRemaining;
  /** Advertised offer (%) shown on the email-gate step before a code exists */
  offerPercentOff: number;
  isGenerating?: boolean;
  emailSubmitFailed?: boolean;
  /** True when the code was also sent to the submitted email */
  codeEmailed?: boolean;
  personalization?: DiscountPersonalization | null;
  onDismiss: () => void;
  onSubmitEmail: (email: string) => void;
  onCopyCode: () => Promise<void>;
  /** Deep-links the code into the purchase flow (cart or tickets section) */
  onUseCode: () => void;
}

function formatCountdown(countdown: TimeRemaining): string {
  return `${countdown.hours}:${padZero(countdown.minutes)}:${padZero(countdown.seconds)}`;
}

export function DiscountModal({
  data,
  countdown,
  offerPercentOff,
  isGenerating = false,
  emailSubmitFailed = false,
  codeEmailed = false,
  personalization,
  onDismiss,
  onSubmitEmail,
  onCopyCode,
  onUseCode,
}: DiscountModalProps) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');

  const handleCopy = useCallback(async () => {
    await onCopyCode();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [onCopyCode]);

  const handleEmailSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!email.trim() || isGenerating) return;
      onSubmitEmail(email.trim());
    },
    [email, isGenerating, onSubmitEmail]
  );

  const countdownText = formatCountdown(countdown);
  const percentOff = data?.percentOff ?? offerPercentOff;

  return (
    <Dialog open onClose={onDismiss} className="relative z-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <DialogBackdrop className="fixed inset-0 bg-black/50" />
      </motion.div>

        <motion.div
          initial={{ opacity: 0, x: '20%', top: 'var(--top-enter)' }}
          animate={{ opacity: 1, x: 0, top: 'var(--top-screen)' }}
          exit={{ opacity: 0, x: '20%', top: 'var(--top-enter)' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed w-auto mx-[2vw] inset-x-0 -translate-y-1/2 [--top-enter:100%] [--top-screen:80%]
                     md:mx-auto md:right-4 md:left-[unset] md:[--top-enter:100%] md:[--top-screen:66%]"
        >
          <DialogPanel className="relative overflow-hidden rounded-3xl border-2 border-white/40 bg-black px-4 py-8 text-center shadow-2xl sm:px-5 sm:py-10">
            {/* Glossy shine effect */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            </div>
            {/* Close button */}
            <button
              onClick={onDismiss}
              className="absolute right-4 top-4 cursor-pointer rounded-full p-1 text-white/50 transition-colors hover:text-white"
              aria-label="Close discount popup"
            >
              <X className="h-5 w-5" strokeWidth={1.5} />
            </button>

            {/* Discount percentage */}
            <div className="mb-2 flex items-baseline justify-center text-white">
              <span className="text-5xl sm:text-7xl leading-none">-{percentOff}</span>
              <span className="text-xl sm:text-2xl leading-none">%</span>
            </div>

            {/* Heading */}
            <h2 className="mb-3 text-lg font-bold text-white sm:text-xl">
              {personalization
                ? `We got ${personalization.stackDisplayName} folks a discount!`
                : 'We got you a discount!'}
            </h2>

            {/* Tech-stack personalization: relevant speakers (no names, no counts) */}
            {personalization && (
              <p className="mb-3 text-sm text-white/70 sm:text-base">
                We&apos;ve got {personalization.stackDisplayName} speakers on the lineup — come meet them.
              </p>
            )}

            {data ? (
              <>
                {/* Subtext with time */}
                <p className="mb-6 text-sm text-white/70 sm:text-base">
                  Buy a ticket <span className="font-mono font-semibold text-white">in the next <code>{countdownText}</code></span> and use the code at checkout:
                </p>

                {/* Code row */}
                <div className="flex items-center justify-center gap-2">
                  {/* Code pill */}
                  <div className="rounded-lg bg-[#252525] px-4 py-2">
                    <code className="font-mono text-base font-semibold tracking-widest text-white sm:text-lg">
                      {data.code.split('').map((char, index) => (
                        <motion.span
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.2,
                            delay: 0.3 + index * 0.05,
                            ease: 'easeOut',
                          }}
                          className="inline-block"
                        >
                          {char}
                        </motion.span>
                      ))}
                    </code>
                  </div>

                  {/* Copy button */}
                  <button
                    onClick={handleCopy}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label={copied ? 'Code copied' : 'Copy code'}
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-green-400" strokeWidth={2} />
                    ) : (
                      <Copy className="h-5 w-5" strokeWidth={1.5} />
                    )}
                  </button>
                </div>

                {/* Deep link into the purchase flow — the code applies itself */}
                <button
                  onClick={onUseCode}
                  className="mt-5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-bold text-black transition-opacity hover:opacity-80"
                >
                  Use it on your ticket
                  <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </button>

                {codeEmailed && (
                  <p className="mt-4 text-xs text-white/50">
                    We&apos;ve also emailed it to you, with the exact expiry time.
                  </p>
                )}
              </>
            ) : (
              <>
                {/* Email gate */}
                <p className="mb-6 text-sm text-white/70 sm:text-base">
                  The code is short-lived — drop your email and we&apos;ll reveal it right here.
                </p>

                <form onSubmit={handleEmailSubmit} className="flex items-center justify-center gap-2">
                  <label htmlFor="discount-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="discount-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-52 rounded-lg bg-[#252525] px-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/60 sm:w-60 sm:text-base"
                  />
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-white text-black transition-opacity hover:opacity-80 disabled:cursor-wait disabled:opacity-50"
                    aria-label="Get my discount code"
                  >
                    <ArrowRight className="h-5 w-5" strokeWidth={2} />
                  </button>
                </form>

                {emailSubmitFailed && (
                  <p role="alert" className="mt-3 text-sm text-red-400">
                    Something went wrong — please try again.
                  </p>
                )}
              </>
            )}
          </DialogPanel>
        </motion.div>
    </Dialog>
  );
}
