/**
 * TicketsSectionWithStripe organism component
 * Wrapper around TicketsSection that fetches pricing from Stripe
 */

import React from 'react';
import { TicketsSection } from './TicketsSection';
import { StudentVerificationModal } from '@/components/molecules';
import { useTicketPricing } from '@/hooks/useTicketPricing';
import { useStudentVerification } from '@/hooks/useStudentVerification';
import { useCart } from '@/contexts/CartContext';
import { createTicketDataFromStripe } from '@/data/tickets';
import { motion } from 'framer-motion';

export interface TicketsSectionWithStripeProps {
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Tickets section with live Stripe pricing integration
 * Shows error UI if Stripe prices fail to load
 */
export const TicketsSectionWithStripe: React.FC<TicketsSectionWithStripeProps> = ({
  className = '',
}) => {
  const { plans, currentStage, isLoading, error, refetch } = useTicketPricing();
  const { addToCart, navigateToCart } = useCart();
  const {
    isModalOpen,
    openModal,
    closeModal,
    handleVerificationSubmit,
    currentPriceId,
  } = useStudentVerification();

  // Show loading state
  if (isLoading) {
    return (
      <section
        id="tickets"
        className={`relative bg-brand-primary py-24 md:py-32 lg:py-40 ${className}`}
        aria-labelledby="tickets-heading"
      >
        <div className="relative z-20 container mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              className="inline-block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center justify-center gap-3">
                <div
                  className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin"
                  role="status"
                  aria-label="Loading ticket prices"
                />
                <p className="text-lg font-bold text-black">Loading ticket prices...</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  // Show error state - NO FALLBACK
  // The hook already validates plans and currentStage, so only check error
  if (error) {
    return (
      <section
        id="tickets"
        className={`relative bg-brand-primary py-24 md:py-32 lg:py-40 ${className}`}
        aria-labelledby="tickets-heading"
      >
        <div className="relative z-20 container mx-auto px-4 md:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-black/10 rounded-3xl p-8 md:p-12">
                <div className="mb-6">
                  <svg
                    className="w-16 h-16 mx-auto text-black/70"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-black mb-4">
                  Unable to Load Ticket Prices
                </h3>
                <p className="text-lg text-black/80 mb-6">
                  {error}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => refetch()}
                    className="px-6 py-3 bg-black text-brand-primary font-bold rounded-full hover:bg-black/90 transition-colors"
                  >
                    Try Again
                  </button>
                  <a
                    href="mailto:tickets@zurichjs.com"
                    className="px-6 py-3 bg-black/10 text-black font-bold rounded-full hover:bg-black/20 transition-colors"
                  >
                    Contact Support
                  </a>
                </div>
                <p className="text-sm text-black/60 mt-6">
                  Need immediate assistance? Email us at{' '}
                  <a
                    href="mailto:tickets@zurichjs.com"
                    className="underline hover:text-black"
                  >
                    tickets@zurichjs.com
                  </a>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    );
  }

  // Show Stripe-powered pricing
  // TypeScript guard: at this point, currentStage must exist (hook validates this)
  if (!currentStage) {
    return null;
  }

  const ticketData = createTicketDataFromStripe(plans, currentStage, openModal, addToCart, navigateToCart);
  return (
    <>
      <TicketsSection {...ticketData} className={className} />
      <StudentVerificationModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onVerificationSubmit={handleVerificationSubmit}
        priceId={currentPriceId || ''}
      />
    </>
  );
};

