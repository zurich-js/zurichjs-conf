/**
 * Example: Voucher Purchase Email
 * Sample data for development and testing
 */

import * as React from 'react';
import { VoucherPurchaseEmail } from '../templates/VoucherPurchaseEmail';
import type { VoucherPurchaseEmailProps } from '../templates/VoucherPurchaseEmail';

/**
 * Sample payload for voucher with 25% bonus (Blind Bird)
 */
export const sampleVoucherDataWithBonus: VoucherPurchaseEmailProps = {
  firstName: 'Emma',
  amountPaid: 100,
  voucherValue: 125, // 100 + 25% bonus
  currency: 'CHF',
  bonusPercent: 25,
  orderUrl: 'https://conf.zurichjs.com/orders/ZJS2026-VOUCHER-12345',
  supportEmail: 'hello@zurichjs.com',
  workshopsUrl: 'https://conf.zurichjs.com/workshops',
};

/**
 * Sample payload for voucher with 15% bonus (Early Bird)
 */
export const sampleVoucherDataEarlyBird: VoucherPurchaseEmailProps = {
  firstName: 'Luca',
  amountPaid: 200,
  voucherValue: 230, // 200 + 15% bonus
  currency: 'CHF',
  bonusPercent: 15,
  orderUrl: 'https://conf.zurichjs.com/orders/ZJS2026-VOUCHER-67890',
  supportEmail: 'hello@zurichjs.com',
  workshopsUrl: 'https://conf.zurichjs.com/workshops',
};

/**
 * Sample payload for voucher without bonus (Regular pricing)
 */
export const sampleVoucherDataNoBonus: VoucherPurchaseEmailProps = {
  firstName: 'Sophie',
  amountPaid: 150,
  voucherValue: 150, // No bonus
  currency: 'CHF',
  bonusPercent: 0,
  orderUrl: 'https://conf.zurichjs.com/orders/ZJS2026-VOUCHER-45678',
  supportEmail: 'hello@zurichjs.com',
  workshopsUrl: 'https://conf.zurichjs.com/workshops',
};

/**
 * Sample payload for 50 CHF voucher with bonus
 */
export const sampleVoucherData50: VoucherPurchaseEmailProps = {
  firstName: 'Max',
  amountPaid: 50,
  voucherValue: 62.5, // 50 + 25% bonus
  currency: 'CHF',
  bonusPercent: 25,
  orderUrl: 'https://conf.zurichjs.com/orders/ZJS2026-VOUCHER-11111',
  supportEmail: 'hello@zurichjs.com',
  workshopsUrl: 'https://conf.zurichjs.com/workshops',
};

/**
 * Default export for email preview tools
 */
export default function VoucherPurchaseEmailExample() {
  return <VoucherPurchaseEmail {...sampleVoucherDataWithBonus} />;
}

/**
 * Named exports for different variations
 */
export function VoucherWithBonusExample() {
  return <VoucherPurchaseEmail {...sampleVoucherDataWithBonus} />;
}

export function VoucherEarlyBirdExample() {
  return <VoucherPurchaseEmail {...sampleVoucherDataEarlyBird} />;
}

export function VoucherNoBonusExample() {
  return <VoucherPurchaseEmail {...sampleVoucherDataNoBonus} />;
}

export function Voucher50Example() {
  return <VoucherPurchaseEmail {...sampleVoucherData50} />;
}
