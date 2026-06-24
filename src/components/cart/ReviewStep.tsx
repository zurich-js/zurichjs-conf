/**
 * Cart Review Step Component
 * Step 1: Review cart items, apply vouchers, see upsells
 */

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useState } from 'react';
import { CartItem, CartSummary, VoucherInput, SeebadEngeModal } from '@/components/molecules';
import { Button, Heading } from '@/components/atoms';
import type { ReviewStepProps, CartItem as CartItemType } from './types';
import { InfoIcon, PlusIcon } from 'lucide-react';

export function ReviewStep({
  cart,
  orderSummary,
  isPartialDiscount,
  showVipUpsell,
  showTeamUpsell,
  onNext,
  onQuantityChange,
  onRemove,
  onApplyVoucher,
  onRemoveVoucher,
  onUpgradeToVip,
  onTeamRequest,
}: ReviewStepProps) {
  const [isSeebadEngeOpen, setIsSeebadEngeOpen] = useState(false);

  const hasTicket = cart.items.some((item) => item.kind !== 'workshop');
  const hasWorkshop = cart.items.some((item) => item.kind === 'workshop');
  const hasVip = cart.items.some((item) => item.kind !== 'workshop' && item.variant === 'vip');
  const hasManualCode = !!cart.couponCode;

  // VIP tickets carry a standing 20% workshop discount that we apply
  // automatically — no emailed coupon to copy/paste. Surface what's happening so
  // VIP buyers understand the perk and aren't tempted to split the purchase.
  const vipPerkNote = hasVip
    ? hasWorkshop
      ? hasManualCode
        ? 'A promo code is applied, so the VIP 20% workshop discount isn’t stacked on top. Remove the code to use the VIP perk instead.'
        : 'VIP perk applied: 20% off your workshops, automatically. No coupon code needed.'
      : 'Your VIP ticket includes 20% off all workshops. Add a workshop and the discount applies automatically at checkout.'
    : null;

  return (
    <motion.div
      key="review"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col lg:flex-row gap-4 lg:gap-8 justify-center"
    >
      {/* Ticket Items */}
      <div className="flex-[2_0_0] flex flex-col gap-5 max-w-screen-lg">
        <Heading level="h1" className="text-xl font-bold text-brand-white">Your tickets</Heading>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {cart.items.map((item: CartItemType, index: number) => (
              <CartItem
                key={item.id}
                item={item}
                onQuantityChange={onQuantityChange}
                onRemove={onRemove}
                delay={index * 0.05}
              />
            ))}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {!hasTicket && (
            <Link
              href="/#tickets"
              className="inline-flex items-center gap-1.5 font-medium text-brand-yellow-main hover:underline"
            >
              <PlusIcon size={14} /> Add a conference ticket
            </Link>
          )}
          <Link
            href="/workshops"
            className="inline-flex items-center gap-1.5 font-medium text-brand-yellow-main hover:underline"
          >
            <PlusIcon size={14} /> {hasWorkshop ? 'Add another workshop' : 'Add a workshop'}
          </Link>
        </div>

        {/* VIP workshop perk note — explains the auto-applied 20% workshop discount */}
        {vipPerkNote && (
          <div
            className="flex items-start gap-2.5 p-3 rounded-2xl border border-brand-green/40 bg-brand-green/10"
            role="status"
          >
            <InfoIcon size={16} className="mt-0.5 shrink-0 text-brand-green" aria-hidden="true" />
            <p className="text-sm text-brand-gray-light">{vipPerkNote}</p>
          </div>
        )}

        {/* VIP Upgrade Upsell Banner */}
        {showVipUpsell && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 p-4 rounded-4xl border border-brand-gray-medium border-dashed">
                <h3 className="text-lg font-bold text-brand-white mb-1">
                  Want an extra special experience?
                </h3>
                <p className="text-sm text-brand-gray-light mb-4">
                  Get{' '}
                  <button
                    type="button"
                    onClick={() => setIsSeebadEngeOpen(true)}
                    className="inline-flex items-center gap-1 text-white hover:text-brand-yellow-main font-bold underline decoration-dotted underline-offset-4 transition-colors cursor-pointer drop-shadow-md drop-shadow-brand-yellow-main/30"
                  >
                    exclusive after party access
                    <InfoIcon size={14} />
                  </button>
                  , <strong className="text-white drop-shadow-md drop-shadow-brand-yellow-main/30">limited edition goodies</strong>, and <strong className="text-white drop-shadow-md drop-shadow-brand-yellow-main/30">20% discount to all workshops</strong>. Only 15 VIP seats available!
                </p>
                <Button variant="primary" size="sm" onClick={onUpgradeToVip}>
                  Upgrade to VIP
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Team Package Upsell Banner */}
        {showTeamUpsell && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="text-md font-bold text-brand-white mb-1">
                  Coming as a group?
                </h3>
                <p className="text-sm text-brand-gray-light mb-4">
                  We offer <strong className="text-brand-yellow-main drop-shadow-md drop-shadow-brand-yellow-main/30">custom team pricing</strong> and simplified invoicing for groups. Let us create a package tailored for your team!
                </p>
                <Button variant="primary" onClick={onTeamRequest} size="sm">
                  Request Team Quote
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Discount Code Input */}
        <div>
          <h3 className="text-lg font-semibold text-brand-white mb-4">Promo Code</h3>
          <VoucherInput onApply={onApplyVoucher} />
        </div>
      </div>

      {/* Order Summary Sidebar */}
      <div className="flex-[1_0_0] lg:max-w-screen-xs sticky top-16 lg:top-24 flex flex-col gap-5">
        <Heading level="h2" className="text-lg mt-1.5 font-bold text-brand-white">Order summary</Heading>

        <CartSummary
          summary={orderSummary}
          showTax={false}
          showDiscount={true}
          voucherCode={cart.couponCode}
          discountType={cart.discountType}
          discountValue={cart.discountValue}
          isPartialDiscount={isPartialDiscount}
          onRemoveVoucher={onRemoveVoucher}
        />

        <Button variant="accent" onClick={onNext} className="w-full">
          Continue
        </Button>

        <Link href="/trip-cost" target="_blank" rel="noopener">
          <Button className="w-full" asChild variant="ghost">
            Estimate your trip cost
          </Button>
        </Link>

        <p className="text-center text-sm text-brand-gray-light">
          Questions about your order?{' '}
          <a
            href="mailto:hello@zurichjs.com"
            className="font-medium text-brand-yellow-main hover:underline"
          >
            hello@zurichjs.com
          </a>
        </p>
      </div>

      <SeebadEngeModal
        isOpen={isSeebadEngeOpen}
        onClose={() => setIsSeebadEngeOpen(false)}
      />
    </motion.div>
  );
}
