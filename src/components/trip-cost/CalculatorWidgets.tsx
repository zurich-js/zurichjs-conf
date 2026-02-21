/**
 * Trip Cost Calculator — Reusable sub-components
 */

import React from 'react';
import { Lightbulb } from 'lucide-react';
import type { DisplayCurrency } from '@/config/trip-cost';
import { CURRENCY_META } from '@/config/trip-cost';
import type { ExchangeRates } from '@/lib/trip-cost/use-exchange-rate';

/** Format a number with no decimals, en-CH locale */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-CH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/** Format an amount with currency prefix (symbol for non-CHF, code for CHF) */
export function formatAmount(amount: number, currency: DisplayCurrency): string {
  const meta = CURRENCY_META[currency];
  return `${meta.symbol} ${formatNumber(amount)}`;
}

/** Convert CHF to the display currency using the rates record. Returns null if rate unavailable. */
export function toDisplayCurrency(
  chf: number,
  currency: DisplayCurrency,
  rates: ExchangeRates,
): number | null {
  if (currency === 'CHF') return chf;
  const rate = rates[currency];
  if (!rate) return null;
  return Math.round(chf * rate);
}

/** Get the secondary currency label (e.g. "~CHF 123" when primary is non-CHF) */
export function secondaryCurrencyLabel(
  chf: number,
  currency: DisplayCurrency,
): string {
  if (currency === 'CHF') return '';
  return `~CHF ${formatNumber(chf)}`;
}

/** Section wrapper for each calculator input group */
export function CalculatorSection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-gray-200 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700">
          {icon}
        </div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const SPENDING_TIPS = [
  'Book your ticket during the early bird phase',
  'Fly mid-week or with budget airlines',
  'Share an apartment with other attendees',
  'Stay 2-3 tram stops from the venue — same convenience, lower prices',
  'Student or unemployed? Apply for a discounted ticket',
];

/** Tips section below the cost breakdown */
export function SpendLessTips() {
  return (
    <div className="mt-6 bg-gray-50 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-brand-yellow-main" />
        <h3 className="text-sm font-semibold text-gray-900">Ways to spend less</h3>
      </div>
      <ul className="space-y-2 text-sm text-gray-600">
        {SPENDING_TIPS.map((tip) => (
          <li key={tip} className="flex items-start gap-2">
            <span className="text-brand-yellow-main mt-0.5">•</span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Single row in the cost breakdown card */
export function BreakdownRow({
  label,
  chf,
  nativePrice,
  sublabel,
  dimmed,
  currency,
  rates,
}: {
  label: string;
  chf: number;
  /** Optional fetched native price (Stripe) — used instead of converting CHF when provided */
  nativePrice?: number;
  sublabel?: string;
  dimmed?: boolean;
  currency: DisplayCurrency;
  rates: ExchangeRates;
}) {
  const hasNativePrice = nativePrice !== undefined;
  const converted = toDisplayCurrency(chf, currency, rates);
  const primary = currency !== 'CHF' && hasNativePrice ? nativePrice : (converted ?? chf);
  // Prefix with ~ when converting CHF to another currency (not native)
  const isConverted = currency !== 'CHF' && !hasNativePrice;
  // Show secondary CHF price when displaying a non-CHF currency without a native price
  const showSecondary = chf > 0 && !hasNativePrice && currency !== 'CHF';
  const secondary = secondaryCurrencyLabel(chf, currency);

  return (
    <div className={`flex items-start justify-between ${dimmed ? 'opacity-40' : ''}`}>
      <div>
        <span className="text-sm text-brand-gray-light">{label}</span>
        {sublabel && (
          <span className="block text-xs text-brand-gray-medium">{sublabel}</span>
        )}
      </div>
      <div className="text-right shrink-0 ml-4">
        <span className="text-sm font-medium">
          {isConverted ? '~' : ''}{formatAmount(primary, currency)}
        </span>
        {showSecondary && (
          <span className="block text-xs text-brand-gray-medium">{secondary}</span>
        )}
      </div>
    </div>
  );
}
