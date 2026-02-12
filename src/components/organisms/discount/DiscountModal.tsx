/**
 * Discount Modal
 *
 * Full-screen dark modal showing the discount code, countdown timer,
 * and copy-to-clipboard functionality. Uses HeadlessUI Dialog.
 */

import { useState, useCallback } from 'react';
import { Dialog, DialogPanel, DialogBackdrop } from '@headlessui/react';
import { motion } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';
import { padZero } from '@/hooks/useCountdown';
import type { DiscountData } from '@/lib/discount/types';
import type { TimeRemaining } from '@/hooks/useCountdown';

interface DiscountModalProps {
  data: DiscountData;
  countdown: TimeRemaining;
  onDismiss: () => void;
  onCopyCode: () => Promise<void>;
}

function formatCountdown(countdown: TimeRemaining): string {
  return `${countdown.hours}:${padZero(countdown.minutes)}:${padZero(countdown.seconds)}`;
}

export function DiscountModal({ data, countdown, onDismiss, onCopyCode }: DiscountModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await onCopyCode();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [onCopyCode]);

  const countdownText = formatCountdown(countdown);

  return (
    <Dialog open onClose={onDismiss} className="relative z-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <DialogBackdrop className="fixed inset-0 bg-black/50" />
      </motion.div>

      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="mx-auto w-full max-w-2xl"
        >
          <DialogPanel className="relative overflow-hidden rounded-3xl border-2 border-white/40 bg-black px-6 py-8 text-center shadow-2xl sm:px-12 sm:py-12">
            {/* Glossy shine effect */}
            <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
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
              <span className="text-5xl font-bold tracking-tight sm:text-7xl">-{data.percentOff}</span>
              <span className="text-xl font-bold sm:text-3xl">%</span>
            </div>

            {/* Heading */}
            <h2 className="mb-3 text-lg font-bold text-white sm:text-xl">
              We got you a discount!
            </h2>

            {/* Subtext with time */}
            <p className="mb-6 text-sm text-white/70 sm:whitespace-nowrap sm:text-base">
              Buy a ticket <span className="font-mono font-semibold text-white">in the next {countdownText}</span> and use the code at checkout:
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
          </DialogPanel>
        </motion.div>
      </div>
    </Dialog>
  );
}
