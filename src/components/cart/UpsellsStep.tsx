/**
 * Cart Upsells Step Component
 * Step 3: Workshop voucher upsells with bonus credit
 */

import { motion } from 'framer-motion';
import { WorkshopVoucherCard } from '@/components/molecules';
import { Button, Heading } from '@/components/atoms';
import { SectionContainer } from '@/components/organisms';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';
import type { UpsellsStepProps } from './types';

export function UpsellsStep({
  workshopVouchers,
  bonusPercent,
  needsAttendeeInfo,
  onNext,
  onBack,
  onAddVoucher,
  onSkip,
}: UpsellsStepProps) {
  const handleSkip = () => {
    // Track workshop upsell skip
    analytics.track('workshop_upsell_skipped', {
      bonus_percent: bonusPercent,
    } as EventProperties<'workshop_upsell_skipped'>);
    onSkip();
  };

  return (
    <SectionContainer>
      <motion.div
        key="upsells"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-5"
      >
        <Heading level="h1" className="text-xl font-bold text-brand-white">
          Add workshop credit
        </Heading>

        <p className="leading-relaxed">
          Get <span className="text-brand-primary font-bold">{bonusPercent}% bonus credit</span> on workshop vouchers during this pricing stage.
          Valid for both conference workshops and ZurichJS meetup workshops.
        </p>

        {/* Voucher Cards */}
        <div className="space-y-3 sm:space-y-4 mb-12">
          {workshopVouchers.map((voucher) => (
            <WorkshopVoucherCard
              key={voucher.id}
              amount={voucher.amount / 100}
              bonusPercent={bonusPercent}
              currency={voucher.currency}
              onClick={() => onAddVoucher(voucher.id)}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-4">
          <Button
            variant="primary"
            size="lg"
            onClick={onNext}
            className="w-full sm:w-auto sm:px-16"
          >
            Continue to Payment
          </Button>
          <button
            onClick={handleSkip}
            className="text-brand-gray-light hover:text-brand-white transition-colors cursor-pointer text-sm"
          >
            Skip workshop credit
          </button>
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-300 transition-colors cursor-pointer text-sm inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {needsAttendeeInfo ? 'attendees' : 'tickets'}
          </button>
        </div>
      </motion.div>
    </SectionContainer>
  );
}
