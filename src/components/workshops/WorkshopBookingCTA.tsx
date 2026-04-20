/**
 * WorkshopBookingCTA
 * Booking call-to-action component that handles 3 user states:
 * 1. Has conference ticket -> Book workshop
 * 2. No ticket -> Combo offer (ticket + workshop, 10% off)
 * 3. Already booked -> Show booked state
 */

import React from 'react';
import Link from 'next/link';
import { Check, ShoppingCart, Ticket, AlertCircle } from 'lucide-react';
import { Button } from '@/components/atoms';
import type { PublicWorkshop } from '@/lib/types/workshop';
import { COMBO_DISCOUNT_PERCENT } from '@/lib/types/workshop';

export interface WorkshopBookingCTAProps {
  workshop: PublicWorkshop;
  /** Whether the user already has a conference ticket */
  hasTicket?: boolean;
  /** Whether the user has already booked this workshop */
  isBooked?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Callback for booking action */
  onBook?: () => void;
  /** Callback for combo purchase */
  onComboBook?: () => void;
  /** Callback for waitlist */
  onJoinWaitlist?: () => void;
}

export const WorkshopBookingCTA: React.FC<WorkshopBookingCTAProps> = ({
  workshop,
  hasTicket = false,
  isBooked = false,
  loading = false,
  onBook,
  onComboBook,
  onJoinWaitlist,
}) => {
  const { price, currency, is_sold_out, seats_remaining } = workshop;
  const priceFormatted = (price / 100).toFixed(0);
  const lowSeats = !is_sold_out && seats_remaining <= 5;

  // Already booked
  if (isBooked) {
    return (
      <div className="bg-brand-green/10 border border-brand-green/30 rounded-xl p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center">
            <Check className="w-5 h-5 text-brand-white" />
          </div>
          <p className="text-base font-semibold text-brand-green">You are booked!</p>
        </div>
        <p className="text-sm text-brand-gray-lightest ml-11">
          Check your email for confirmation details, or visit your{' '}
          <Link href="/account/workshops" className="text-brand-blue hover:underline">
            bookings page
          </Link>
          .
        </p>
      </div>
    );
  }

  // Sold out
  if (is_sold_out) {
    return (
      <div className="bg-surface-card rounded-xl p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-5 h-5 text-brand-orange" />
          <p className="text-base font-semibold text-brand-orange">Sold Out</p>
        </div>
        <p className="text-sm text-brand-gray-lightest mb-4">
          This workshop is fully booked. Join the waitlist and we will notify you if a spot opens up.
        </p>
        <Button variant="outline" onClick={onJoinWaitlist} disabled={loading} loading={loading}>
          Join Waitlist
        </Button>
      </div>
    );
  }

  // Has ticket -> direct booking
  if (hasTicket) {
    return (
      <div className="bg-surface-card rounded-xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-brand-gray-light">Workshop Price</p>
            <p className="text-2xl font-bold text-brand-white">
              <span className="text-sm font-normal text-brand-gray-light">{currency}</span>{' '}
              {priceFormatted}
            </p>
          </div>
          {lowSeats && (
            <span className="text-xs font-semibold text-brand-orange">
              Only {seats_remaining} left!
            </span>
          )}
        </div>
        <Button variant="primary" className="w-full" onClick={onBook} disabled={loading} loading={loading}>
          <ShoppingCart className="w-4 h-4" />
          Book Workshop
        </Button>
        <p className="text-xs text-brand-gray-light mt-3 text-center">
          Your conference ticket was verified. You can book directly.
        </p>
      </div>
    );
  }

  // No ticket -> combo offer
  return (
    <div className="bg-surface-card rounded-xl p-5 sm:p-6 border border-brand-yellow-main/20">
      <div className="flex items-center gap-2 mb-3">
        <Ticket className="w-5 h-5 text-brand-yellow-main" />
        <p className="text-sm font-semibold text-brand-yellow-main">
          {COMBO_DISCOUNT_PERCENT}% off when you add a conference ticket!
        </p>
      </div>
      <p className="text-sm text-brand-gray-lightest mb-4">
        A conference ticket is required to attend workshops. Bundle them together and save.
      </p>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-brand-gray-light">Workshop Price</p>
          <p className="text-xl font-bold text-brand-white">
            <span className="text-sm font-normal text-brand-gray-light">{currency}</span>{' '}
            {priceFormatted}
          </p>
        </div>
        {lowSeats && (
          <span className="text-xs font-semibold text-brand-orange">
            Only {seats_remaining} left!
          </span>
        )}
      </div>
      <div className="space-y-2">
        <Button variant="primary" className="w-full" onClick={onComboBook} disabled={loading} loading={loading}>
          <ShoppingCart className="w-4 h-4" />
          Get Ticket + Workshop ({COMBO_DISCOUNT_PERCENT}% off)
        </Button>
        <Button variant="ghost" className="w-full text-sm" onClick={onBook} disabled={loading}>
          I already have a ticket
        </Button>
      </div>
    </div>
  );
};
