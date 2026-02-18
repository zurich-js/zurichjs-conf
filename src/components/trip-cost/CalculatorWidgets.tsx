/**
 * Trip Cost Calculator — Reusable sub-components
 */

import React from 'react';
import { Lightbulb } from 'lucide-react';

/** Format a number with no decimals, en-CH locale */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-CH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
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
  eur,
  sublabel,
  dimmed,
}: {
  label: string;
  chf: number;
  eur?: number;
  sublabel?: string;
  dimmed?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between ${dimmed ? 'opacity-40' : ''}`}>
      <div>
        <span className="text-sm text-brand-gray-light">{label}</span>
        {sublabel && (
          <span className="block text-xs text-brand-gray-medium">{sublabel}</span>
        )}
      </div>
      <div className="text-right shrink-0 ml-4">
        <span className="text-sm font-medium">CHF {formatNumber(chf)}</span>
        {eur !== undefined && (
          <span className="block text-xs text-brand-gray-medium">
            ~EUR {formatNumber(eur)}
          </span>
        )}
      </div>
    </div>
  );
}
