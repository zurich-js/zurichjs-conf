/**
 * TicketsSectionWithStripe organism component
 * Wrapper around TicketsSection that fetches pricing from Stripe
 */

import React, { useState } from 'react';
import { TicketsSection } from './TicketsSection';
import { StudentVerificationModal, VerificationSuccessModal } from '@/components/molecules';
import { useTicketPricing } from '@/hooks/useTicketPricing';
import { useStudentVerification } from '@/hooks/useStudentVerification';
import { useCart } from '@/contexts/CartContext';
import { createTicketDataFromStripe } from '@/data/tickets';
import { motion } from 'framer-motion';
import {SectionContainer} from "@/components/organisms/SectionContainer";

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
    isSuccessDialogOpen,
    closeSuccessDialog,
    verifiedEmail,
    verificationId,
  } = useStudentVerification();
  const [isNavigating, setIsNavigating] = useState(false);

  // Show loading state only when there's no data yet
  // During hydration, isLoading might be true briefly even with prefetched data
  // By checking plans.length === 0, we avoid hydration mismatch
  if (isLoading && plans.length === 0) {
    return (
      <SectionContainer
        className={`relative ${className}`}
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
      </SectionContainer>
    );
  }

  // Show error state - NO FALLBACK
  // The hook already validates plans and currentStage, so only check error
  if (error) {
    return (
      <SectionContainer className={`${className}`} aria-labelledby="tickets-heading">
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
              <h3 className="text-xl font-bold text-black mb-4">
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
                  href="mailto:hello@zurichjs.com"
                  className="px-6 py-3 bg-black/10 text-black font-bold rounded-full hover:bg-black/20 transition-colors"
                >
                  Contact Support
                </a>
              </div>
              <p className="text-sm text-black/60 mt-6">
                Need immediate assistance? Email us at{' '}
                <a
                  href="mailto:hello@zurichjs.com"
                  className="underline hover:text-black"
                >
                  hello@zurichjs.com
                </a>
              </p>
            </div>
          </motion.div>
      </SectionContainer>
    );
  }

  // Show Stripe-powered pricing
  // TypeScript guard: at this point, currentStage must exist (hook validates this)
  if (!currentStage) {
    return null;
  }

  const wrappedAddToCart: typeof addToCart = (item, quantity) => {
    setIsNavigating(true);
    addToCart(item, quantity);
  };

  const ticketData = createTicketDataFromStripe(plans, currentStage, openModal, wrappedAddToCart, navigateToCart);

  // Disable all CTAs while navigating to prevent duplicate adds
  if (isNavigating) {
    ticketData.plans = ticketData.plans.map((plan) => ({
      ...plan,
      cta: plan.cta.type === 'button'
        ? { ...plan.cta, loading: true, disabled: true }
        : plan.cta,
    }));
  }

  return (
    <>
      <TicketsSection {...ticketData} className={className} />
      <StudentVerificationModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onVerificationSubmit={handleVerificationSubmit}
        priceId={currentPriceId || ''}
      />
      <VerificationSuccessModal
        isOpen={isSuccessDialogOpen}
        onClose={closeSuccessDialog}
        email={verifiedEmail}
        verificationId={verificationId}
      />
    </>
  );
};

