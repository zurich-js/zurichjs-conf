/**
 * TicketsSectionWithStripe organism component
 * Wrapper around TicketsSection that fetches pricing from Stripe
 */

import React from 'react';
import { TicketsSection } from './TicketsSection';
import { useTicketPricing } from '@/hooks/useTicketPricing';
import { createTicketDataFromStripe, ticketsData } from '@/data/tickets';
import { motion } from 'framer-motion';

export interface TicketsSectionWithStripeProps {
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Tickets section with live Stripe pricing integration
 * Falls back to static pricing if Stripe is unavailable
 */
export const TicketsSectionWithStripe: React.FC<TicketsSectionWithStripeProps> = ({
  className = '',
}) => {
  const { plans, currentStage, isLoading, error } = useTicketPricing();

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

  // Show error state with fallback to static data
  if (error) {
    console.error('Failed to load Stripe pricing, using fallback data:', error);
    // Fall back to static pricing
    return <TicketsSection {...ticketsData} className={className} />;
  }

  // Show Stripe-powered pricing
  if (plans.length > 0 && currentStage) {
    const ticketData = createTicketDataFromStripe(plans, currentStage);
    return <TicketsSection {...ticketData} className={className} />;
  }

  // Fallback to static pricing
  return <TicketsSection {...ticketsData} className={className} />;
};

