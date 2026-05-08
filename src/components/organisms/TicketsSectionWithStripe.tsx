/**
 * TicketsSectionWithStripe organism component
 * Wrapper around TicketsSection that fetches pricing from Stripe
 */

import React, { useState, useCallback } from 'react';
import { TicketsSection } from './TicketsSection';
import { StudentVerificationModal, VerificationSuccessModal, StudentTicketInfoModal, SeebadEngeModal } from '@/components/molecules';
import { useTicketPricing } from '@/hooks/useTicketPricing';
import { useStudentVerification } from '@/hooks/useStudentVerification';
import { useCart } from '@/contexts/CartContext';
import { createTicketDataFromStripe } from '@/data/tickets';
import { motion } from 'framer-motion';
import {SectionContainer} from "@/components/organisms/SectionContainer";
import { Heading, Kicker } from '@/components/atoms';

export interface TicketsSectionWithStripeProps {
  /**
   * Additional CSS classes
   */
  className?: string;
}

function TicketPriceCardSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <article
      className="flex-1 flex flex-col max-w-screen-xs relative bg-brand-black rounded-4xl p-6"
      aria-hidden="true"
      style={{ boxShadow: featured ? '5px 7px 15px rgba(0,0,0,0.4)' : undefined }}
    >
      <div className="flex flex-col gap-6 h-full animate-pulse">
        <div className="flex items-center justify-between gap-6">
          <div className="h-7 w-32 rounded-full bg-brand-white/80" />
          {featured && <div className="h-6 w-16 rounded-full bg-brand-primary/80" />}
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded-full bg-brand-gray-lightest/25" />
          <div className="h-3 w-4/5 rounded-full bg-brand-gray-lightest/25" />
        </div>
        <div className="space-y-2">
          <div className="h-10 w-40 rounded-full bg-brand-white/85" />
          <div className="h-3 w-20 rounded-full bg-brand-gray-lightest/30" />
        </div>
        <div className="flex-1 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-brand-primary/70" />
              <div className="h-3 flex-1 rounded-full bg-brand-gray-lightest/25" />
            </div>
          ))}
        </div>
        <div className="h-11 w-full rounded-full bg-brand-primary/85" />
      </div>
    </article>
  );
}

function TicketCardsSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex flex-col gap-10 ${className}`} aria-labelledby="tickets-heading">
      <motion.div
        className="flex flex-col gap-2.5 items-center text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Kicker variant="light">TICKETS</Kicker>
        <Heading
          level="h2"
          variant="light"
          className="text-xl text-balance leading-none"
        >
          Tickets
        </Heading>
        <div className="mt-2 h-4 w-64 max-w-[80vw] rounded-full bg-black/15 animate-pulse" aria-hidden="true" />
      </motion.div>

      <div className="flex flex-col gap-12">
        <div className="flex flex-col items-stretch lg:flex-row gap-8 xl:gap-12 lg:items-center justify-center max-w-7xl mx-auto">
          <TicketPriceCardSkeleton />
          <TicketPriceCardSkeleton featured />
          <TicketPriceCardSkeleton />
        </div>
      </div>
    </div>
  );
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
  const [isStudentInfoModalOpen, setIsStudentInfoModalOpen] = useState(false);
  const [isSeebadEngeModalOpen, setIsSeebadEngeModalOpen] = useState(false);

  const openStudentInfoModal = useCallback(() => {
    setIsStudentInfoModalOpen(true);
  }, []);

  const closeStudentInfoModal = useCallback(() => {
    setIsStudentInfoModalOpen(false);
  }, []);

  const openSeebadEngeModal = useCallback(() => {
    setIsSeebadEngeModalOpen(true);
  }, []);

  const closeSeebadEngeModal = useCallback(() => {
    setIsSeebadEngeModalOpen(false);
  }, []);

  // Show loading state only when there's no data yet
  // During hydration, isLoading might be true briefly even with prefetched data
  // By checking plans.length === 0, we avoid hydration mismatch
  if (isLoading && plans.length === 0) {
    return (
      <SectionContainer className={`relative ${className}`} aria-labelledby="tickets-heading">
        <TicketCardsSkeleton />
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

  // Determine if student tickets are sold out (for the info modal)
  const studentPlan = plans.find(p => p.id === 'standard_student_unemployed');
  const isStudentSoldOut = studentPlan?.stock?.soldOut ?? false;

  const ticketData = createTicketDataFromStripe(plans, currentStage, openModal, wrappedAddToCart, navigateToCart, openStudentInfoModal, openSeebadEngeModal);

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
      <StudentTicketInfoModal
        isOpen={isStudentInfoModalOpen}
        onClose={closeStudentInfoModal}
        isSoldOut={isStudentSoldOut}
      />
      <SeebadEngeModal
        isOpen={isSeebadEngeModalOpen}
        onClose={closeSeebadEngeModal}
      />
    </>
  );
};
